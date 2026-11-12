import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip, TripStatus, LocationPoint } from '../types';
import { authService } from './authService';
import { API_BASE_URL } from './apiConfig';

export const getActiveTripKey = (email?: string) =>
  email ? `@saferoute_active_trip_${email.trim().toLowerCase()}` : '@saferoute_active_trip';

export const getTripHistoryKey = (email?: string) =>
  email ? `@saferoute_trip_history_${email.trim().toLowerCase()}` : '@saferoute_trip_history';

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 3500) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

export const tripService = {
  /**
   * Start and create a new trip (syncs with backend API & local persistent storage)
   */
  async startTrip(payload: {
    userId: string;
    startLocation: LocationPoint;
    destination: LocationPoint;
    transportMode?: string;
    estimatedMinutes?: number;
    contactsNotified?: string[];
  }): Promise<Trip> {
    const token = await authService.getStoredToken();
    const storedUser = await authService.getStoredUser();
    const activeKey = getActiveTripKey(storedUser?.email);

    const newTrip: Trip = {
      id: 'trip_' + Date.now(),
      userId: payload.userId || storedUser?.id || 'user_active',
      startLocation: payload.startLocation,
      destination: payload.destination,
      currentLocation: payload.startLocation,
      startTime: new Date().toISOString(),
      status: 'ACTIVE',
      transportMode: payload.transportMode || 'Transit',
      estimatedMinutes: payload.estimatedMinutes || 25,
      contactsNotified: payload.contactsNotified || ['Mom', 'Dad'],
    };

    // 1. Persist locally in user-scoped AsyncStorage
    try {
      await AsyncStorage.setItem(activeKey, JSON.stringify(newTrip));
    } catch (e) {
      console.warn('[TripService] Failed to cache active trip locally:', e);
    }

    // 2. Sync with Backend REST API
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(storedUser?.id ? { 'x-user-id': storedUser.id } : {}),
        ...(storedUser?.email ? { 'x-user-email': storedUser.email } : {}),
      };

      const response = await fetchWithTimeout(`${API_BASE_URL}/trips/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: payload.userId || storedUser?.id,
          destination: {
            name: payload.destination.name,
            address: payload.destination.address,
            latitude: payload.destination.latitude,
            longitude: payload.destination.longitude,
          },
          startLocation: {
            name: payload.startLocation.name,
            latitude: payload.startLocation.latitude,
            longitude: payload.startLocation.longitude,
            address: payload.startLocation.address,
          },
          startTime: newTrip.startTime,
          estimatedMinutes: payload.estimatedMinutes || 25,
          transportMode: payload.transportMode || 'Transit',
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.data && (json.data.id || json.data._id)) {
          newTrip.id = json.data.id || json.data._id;
          await AsyncStorage.setItem(activeKey, JSON.stringify(newTrip));
        }
      }
    } catch {
      // Backend offline; operating in offline-first mode
    }

    return newTrip;
  },

  /**
   * Update the live location of an active trip
   */
  async updateLiveLocation(tripId: string, location: LocationPoint): Promise<void> {
    const storedUser = await authService.getStoredUser();
    const activeKey = getActiveTripKey(storedUser?.email);

    try {
      const activeStr = await AsyncStorage.getItem(activeKey);
      if (activeStr) {
        const trip: Trip = JSON.parse(activeStr);
        trip.currentLocation = location;
        await AsyncStorage.setItem(activeKey, JSON.stringify(trip));
      }
    } catch {}

    // Asynchronously notify backend
    try {
      const token = await authService.getStoredToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(storedUser?.id ? { 'x-user-id': storedUser.id } : {}),
        ...(storedUser?.email ? { 'x-user-email': storedUser.email } : {}),
      };

      await fetchWithTimeout(
        `${API_BASE_URL}/trips/${tripId}/location`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              address: location.address,
              accuracy: location.accuracy,
            },
          }),
        },
        2000
      );
    } catch {
      // Ignore network failures for live location pings
    }
  },

  /**
   * Complete an ongoing trip safely (Stop Trip / Reached Safely)
   */
  async completeTrip(tripId: string, endLocation?: LocationPoint): Promise<Trip | null> {
    const storedUser = await authService.getStoredUser();
    const activeKey = getActiveTripKey(storedUser?.email);
    const historyKey = getTripHistoryKey(storedUser?.email);

    const activeTrip = await this.getActiveTrip(storedUser?.email);
    const destination = activeTrip?.destination || {
      name: 'Destination',
      latitude: 16.5062,
      longitude: 80.648,
    };

    const completedTrip: Trip = {
      ...(activeTrip || {
        id: tripId,
        userId: storedUser?.id || storedUser?.email || 'user_active',
        startLocation: { name: 'Origin', latitude: 16.4614, longitude: 80.5069 },
        destination,
        startTime: new Date(Date.now() - 25 * 60000).toISOString(),
      }),
      status: 'COMPLETED',
      endTime: new Date().toISOString(),
      endLocation: endLocation || destination,
    };

    // 1. Remove active trip from storage
    await AsyncStorage.removeItem(activeKey);

    // 2. Append to user-isolated history
    try {
      const historyStr = await AsyncStorage.getItem(historyKey);
      const history: Trip[] = historyStr ? JSON.parse(historyStr) : [];
      history.unshift(completedTrip);
      await AsyncStorage.setItem(historyKey, JSON.stringify(history));
    } catch (e) {
      console.warn('[TripService] Failed to save trip history:', e);
    }

    // 3. Notify backend
    try {
      const token = await authService.getStoredToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(storedUser?.id ? { 'x-user-id': storedUser.id } : {}),
        ...(storedUser?.email ? { 'x-user-email': storedUser.email } : {}),
      };

      await fetchWithTimeout(`${API_BASE_URL}/trips/${tripId}/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ endLocation }),
      });
    } catch {}

    return completedTrip;
  },

  /**
   * Cancel an active trip (Stop Trip / Cancel Tracking)
   */
  async cancelTrip(tripId: string): Promise<Trip | null> {
    const storedUser = await authService.getStoredUser();
    const activeKey = getActiveTripKey(storedUser?.email);

    const activeTrip = await this.getActiveTrip(storedUser?.email);
    if (!activeTrip) return null;

    const cancelledTrip: Trip = {
      ...activeTrip,
      status: 'CANCELLED',
      endTime: new Date().toISOString(),
    };

    await AsyncStorage.removeItem(activeKey);

    try {
      const token = await authService.getStoredToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(storedUser?.id ? { 'x-user-id': storedUser.id } : {}),
        ...(storedUser?.email ? { 'x-user-email': storedUser.email } : {}),
      };

      await fetchWithTimeout(`${API_BASE_URL}/trips/${tripId}/cancel`, {
        method: 'POST',
        headers,
      });
    } catch {}

    return cancelledTrip;
  },

  /**
   * Retrieve active trip if currently in progress for the active user
   */
  async getActiveTrip(email?: string): Promise<Trip | null> {
    try {
      let targetEmail = email;
      if (!targetEmail) {
        const storedUser = await authService.getStoredUser();
        targetEmail = storedUser?.email;
      }
      const activeKey = getActiveTripKey(targetEmail);
      const tripStr = await AsyncStorage.getItem(activeKey);
      return tripStr ? JSON.parse(tripStr) : null;
    } catch {
      return null;
    }
  },

  /**
   * Fetch trip history (cloud synced + user-scoped offline cache)
   */
  async getTripHistory(email?: string): Promise<Trip[]> {
    let targetEmail = email;
    const storedUser = await authService.getStoredUser();
    if (!targetEmail) {
      targetEmail = storedUser?.email;
    }
    const historyKey = getTripHistoryKey(targetEmail);

    // 1. Try syncing from backend
    try {
      const token = await authService.getStoredToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(storedUser?.id ? { 'x-user-id': storedUser.id } : {}),
        ...(targetEmail ? { 'x-user-email': targetEmail } : {}),
      };

      const res = await fetchWithTimeout(`${API_BASE_URL}/trips/history`, {
        method: 'GET',
        headers,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const mapped: Trip[] = json.data.map((t: any) => ({
            id: t._id || t.id,
            userId: t.userId,
            startLocation: t.startLocation,
            destination: t.destination,
            currentLocation: t.currentLocation || t.startLocation,
            startTime: typeof t.startTime === 'string' ? t.startTime : new Date(t.startTime).toISOString(),
            endTime: t.endTime ? (typeof t.endTime === 'string' ? t.endTime : new Date(t.endTime).toISOString()) : undefined,
            status: t.status || 'COMPLETED',
            estimatedMinutes: t.estimatedDurationMinutes || 25,
            transportMode: t.transportMode || 'Transit',
            contactsNotified: Array.isArray(t.contactsNotified) ? t.contactsNotified.map((c: any) => c.name || 'Contact') : ['Family'],
          }));
          await AsyncStorage.setItem(historyKey, JSON.stringify(mapped));
          return mapped;
        }
      }
    } catch {
      // Cloud offline, read from storage
    }

    // 2. Read from user-scoped storage
    try {
      const historyStr = await AsyncStorage.getItem(historyKey);
      return historyStr ? JSON.parse(historyStr) : [];
    } catch {
      return [];
    }
  },
};
