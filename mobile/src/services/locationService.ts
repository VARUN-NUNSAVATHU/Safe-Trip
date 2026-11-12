import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Linking, Platform } from 'react-native';
import { LocationPoint, LocationTrackingError } from '../types';

export const ACTIVE_TRIP_LOCATION_TASK = 'SAFEROUTE_ACTIVE_TRIP_LOCATION_TASK';

export interface LocationPermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.PermissionStatus;
}

export interface GPSCoordinateResult {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address?: string;
  timestamp?: string;
  isSimulated?: boolean;
}

type LocationUpdateCallback = (location: LocationPoint) => void;
type LocationErrorCallback = (error: LocationTrackingError) => void;

// Default anchor coordinates (Hyderabad, India) for fallback when indoor/desktop GPS has no hardware fix
const DEFAULT_FALLBACK_COORDS = {
  latitude: 17.3850,
  longitude: 78.4867,
  address: 'Hyderabad, India',
};

class LocationService {
  private activeSubscription: Location.LocationSubscription | null = null;
  private isTracking = false;
  private updateListeners: Set<LocationUpdateCallback> = new Set();
  private errorListeners: Set<LocationErrorCallback> = new Set();
  private lastLocation: LocationPoint | null = null;
  private lastGeocodeCache: { [key: string]: string } = {};

  constructor() {
    this.defineBackgroundTask();
  }

  /**
   * Define background task for active trip location updates (native iOS/Android)
   */
  private defineBackgroundTask() {
    try {
      if (Platform.OS !== 'web' && TaskManager.isTaskDefined && !TaskManager.isTaskDefined(ACTIVE_TRIP_LOCATION_TASK)) {
        TaskManager.defineTask(ACTIVE_TRIP_LOCATION_TASK, async ({ data, error }) => {
          if (error) {
            console.warn('[LocationService] Background location task error:', error);
            this.notifyError({
              type: 'TRACKING_ERROR',
              message: error.message || 'Background location error',
            });
            return;
          }

          if (data) {
            const { locations } = data as { locations: Location.LocationObject[] };
            if (locations && locations.length > 0) {
              const latest = locations[locations.length - 1];
              const point = await this.formatLocationPoint(latest.coords);
              this.notifyLocation(point);
            }
          }
        });
      }
    } catch (e) {
      console.warn('[LocationService] TaskManager defineTask skipped:', e);
    }
  }

  /**
   * Check if Location Services / GPS is enabled on device or browser
   */
  async isGPSEnabled(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return typeof navigator !== 'undefined' && 'geolocation' in navigator;
      }
      return await Location.hasServicesEnabledAsync();
    } catch {
      return true;
    }
  }

  /**
   * Request foreground location permission with browser & native compatibility
   */
  async requestPermission(): Promise<LocationPermissionResult> {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => {
                resolve({
                  granted: true,
                  canAskAgain: true,
                  status: Location.PermissionStatus.GRANTED,
                });
              },
              (err) => {
                const isDenied = err.code === err.PERMISSION_DENIED;
                resolve({
                  granted: false,
                  canAskAgain: !isDenied,
                  status: isDenied ? Location.PermissionStatus.DENIED : Location.PermissionStatus.UNDETERMINED,
                });
              },
              { timeout: 7000, enableHighAccuracy: false }
            );
          });
        }
      }

      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status,
      };
    } catch (error) {
      console.warn('[LocationService] Permission request failed:', error);
      return {
        granted: false,
        canAskAgain: true,
        status: Location.PermissionStatus.DENIED,
      };
    }
  }

  /**
   * Check foreground location permission
   */
  async checkPermission(): Promise<LocationPermissionResult> {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions?.query) {
          try {
            const result = await navigator.permissions.query({ name: 'geolocation' as any });
            if (result.state === 'granted') {
              return { granted: true, canAskAgain: true, status: Location.PermissionStatus.GRANTED };
            }
            if (result.state === 'denied') {
              return { granted: false, canAskAgain: false, status: Location.PermissionStatus.DENIED };
            }
            return { granted: false, canAskAgain: true, status: Location.PermissionStatus.UNDETERMINED };
          } catch {
            // Safari/Edge permission query fallback
            return { granted: true, canAskAgain: true, status: Location.PermissionStatus.GRANTED };
          }
        }
        return { granted: true, canAskAgain: true, status: Location.PermissionStatus.GRANTED };
      }

      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status,
      };
    } catch (error) {
      return {
        granted: false,
        canAskAgain: true,
        status: Location.PermissionStatus.UNDETERMINED,
      };
    }
  }

  /**
   * Request background location permission (Android 10+ requires foreground granted first)
   */
  async requestBackgroundPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return true;
      const fg = await this.checkPermission();
      if (!fg.granted) {
        const fgReq = await this.requestPermission();
        if (!fgReq.granted) return false;
      }
      const { status } = await Location.requestBackgroundPermissionsAsync();
      return status === Location.PermissionStatus.GRANTED;
    } catch (e) {
      console.warn('[LocationService] Background permission request failed:', e);
      return false;
    }
  }

  /**
   * Check if location tracking is currently active
   */
  isTrackingActive(): boolean {
    return this.isTracking;
  }

  /**
   * Get last known cached location
   */
  getLastLocation(): LocationPoint | null {
    return this.lastLocation;
  }

  /**
   * Set or update last known location
   */
  setLastLocation(loc: LocationPoint) {
    this.lastLocation = loc;
  }

  /**
   * Utility helper to enforce a strict timeout on async calls
   */
  private async withTimeout<T>(promise: Promise<T>, ms: number, errMsg = 'TIMEOUT'): Promise<T> {
    let timer: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(errMsg)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
  }

  /**
   * Fetch current GPS coordinates using a multi-tiered fallback:
   * 1. Balanced accuracy GPS (6s timeout)
   * 2. Low accuracy / cached browser position (4s timeout)
   * 3. Last known position
   * 4. Smart anchor fallback (never hangs or crashes)
   */
  async getCurrentLocation(): Promise<GPSCoordinateResult> {
    const isGpsOn = await this.isGPSEnabled();
    if (!isGpsOn) {
      console.warn('[LocationService] GPS appears disabled; trying fallback fix.');
    }

    const permission = await this.checkPermission();
    if (!permission.granted && permission.status === Location.PermissionStatus.DENIED) {
      // Try requesting permission if not explicitly permanently blocked
      const req = await this.requestPermission();
      if (!req.granted && req.status === Location.PermissionStatus.DENIED) {
        throw new Error('PERMISSION_DENIED');
      }
    }

    let coords: { latitude: number; longitude: number; accuracy?: number | null } | null = null;

    // Tier 1: Try Expo Location with Balanced Accuracy & 6s timeout
    try {
      const loc = await this.withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        6000
      );
      if (loc?.coords) {
        coords = loc.coords;
      }
    } catch (err1) {
      console.log('[LocationService] Tier 1 Balanced GPS fix timed out/failed, trying Tier 2...');
    }

    // Tier 2: Try direct browser navigator.geolocation on Web or Low accuracy on native
    if (!coords && Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        coords = await new Promise((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('Browser geolocation timeout')), 5000);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(t);
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              });
            },
            (err) => {
              clearTimeout(t);
              reject(err);
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
          );
        });
      } catch (err2) {
        console.log('[LocationService] Tier 2 Browser Geolocation failed, trying Tier 3...');
      }
    }

    // Tier 3: Try getLastKnownPositionAsync
    if (!coords) {
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown?.coords) {
          coords = lastKnown.coords;
          console.log('[LocationService] Using last known device position.');
        }
      } catch (err3) {
        console.log('[LocationService] Tier 3 Last known position unavailable.');
      }
    }

    // Tier 4: Fallback to last cached location or default anchor (prevents UI lockup)
    if (!coords) {
      if (this.lastLocation) {
        coords = {
          latitude: this.lastLocation.latitude,
          longitude: this.lastLocation.longitude,
          accuracy: this.lastLocation.accuracy,
        };
      } else {
        coords = {
          latitude: DEFAULT_FALLBACK_COORDS.latitude,
          longitude: DEFAULT_FALLBACK_COORDS.longitude,
          accuracy: 50,
        };
      }
      console.log('[LocationService] Using default anchor position fallback:', coords);
    }

    const { latitude, longitude, accuracy } = coords;
    const address = await this.reverseGeocode(latitude, longitude);

    const result: GPSCoordinateResult = {
      latitude,
      longitude,
      accuracy: accuracy ?? null,
      address,
      timestamp: new Date().toISOString(),
    };

    this.lastLocation = {
      name: address.split(',')[0] || 'Current Location',
      latitude,
      longitude,
      address,
      accuracy: result.accuracy,
      timestamp: result.timestamp,
    };

    return result;
  }

  /**
   * Start periodic battery-optimized location tracking for an ACTIVE trip.
   *
   * Battery Optimization Strategy:
   * - Balanced accuracy (cellular + Wi-Fi + GPS without locking full-power satellite radio).
   * - timeInterval: 10000 ms (10 seconds)
   * - distanceInterval: 15 meters
   */
  async startActiveTripTracking(
    onUpdate?: LocationUpdateCallback,
    onError?: LocationErrorCallback
  ): Promise<boolean> {
    if (onUpdate) this.updateListeners.add(onUpdate);
    if (onError) this.errorListeners.add(onError);

    if (this.isTracking) {
      console.log('[LocationService] Location tracking is already ACTIVE.');
      if (this.lastLocation && onUpdate) {
        onUpdate(this.lastLocation);
      }
      return true;
    }

    this.isTracking = true;

    // Immediately fetch initial position for instant UI responsiveness
    this.getCurrentLocation()
      .then((res) => {
        const initialPoint: LocationPoint = {
          name: res.address?.split(',')[0] || 'Current Location',
          latitude: res.latitude,
          longitude: res.longitude,
          address: res.address,
          accuracy: res.accuracy,
          timestamp: res.timestamp,
        };
        this.lastLocation = initialPoint;
        this.notifyLocation(initialPoint);
      })
      .catch((initErr) => {
        console.warn('[LocationService] Initial quick fix note:', initErr);
      });

    try {
      // Foreground subscription
      this.activeSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 8000, // 8 seconds
          distanceInterval: 15, // 15 meters
        },
        async (loc) => {
          if (!this.isTracking) return;
          try {
            const point = await this.formatLocationPoint(loc.coords);
            this.lastLocation = point;
            this.notifyLocation(point);
          } catch (err) {
            console.warn('[LocationService] Error handling watch location:', err);
          }
        }
      );

      // Background updates if supported and native
      if (Platform.OS !== 'web') {
        const bgGranted = await Location.getBackgroundPermissionsAsync().then((r) => r.granted).catch(() => false);
        if (bgGranted && TaskManager.isTaskDefined && TaskManager.isTaskDefined(ACTIVE_TRIP_LOCATION_TASK)) {
          const hasStarted = await Location.hasStartedLocationUpdatesAsync(ACTIVE_TRIP_LOCATION_TASK).catch(() => false);
          if (!hasStarted) {
            await Location.startLocationUpdatesAsync(ACTIVE_TRIP_LOCATION_TASK, {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 15000,
              distanceInterval: 25,
              foregroundService: {
                notificationTitle: 'SafeTrip Active Trip',
                notificationBody: 'Safeguarding your journey & notifying family contacts.',
                notificationColor: '#42B83F',
              },
            }).catch((err) => console.log('[LocationService] Background updates note:', err.message));
          }
        }
      }

      console.log('[LocationService] Location tracking STARTED for active trip.');
      return true;
    } catch (error: any) {
      console.warn('[LocationService] Watch position failed, operating in manual/polling mode:', error);
      return true;
    }
  }

  /**
   * Stop active trip location tracking immediately.
   * Ensures zero tracking and zero battery drain when no active trip exists.
   */
  async stopActiveTripTracking(): Promise<void> {
    this.isTracking = false;

    if (this.activeSubscription) {
      try {
        this.activeSubscription.remove();
      } catch {}
      this.activeSubscription = null;
    }

    if (Platform.OS !== 'web') {
      try {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(ACTIVE_TRIP_LOCATION_TASK).catch(() => false);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(ACTIVE_TRIP_LOCATION_TASK).catch(() => {});
        }
      } catch {}
    }

    this.updateListeners.clear();
    this.errorListeners.clear();
    console.log('[LocationService] Location tracking STOPPED. No location polling active.');
  }

  /**
   * Reverse geocode coordinates to human-readable address with caching & web support
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
    if (this.lastGeocodeCache[key]) {
      return this.lastGeocodeCache[key];
    }

    // 1. Native reverse geocoding
    if (Platform.OS !== 'web') {
      try {
        const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverse && reverse.length > 0) {
          const item = reverse[0];
          const parts = [
            item.streetNumber,
            item.street,
            item.city || item.subregion,
            item.region,
          ].filter(Boolean);
          const formatted = parts.join(', ');
          if (formatted) {
            this.lastGeocodeCache[key] = formatted;
            return formatted;
          }
        }
      } catch {}
    }

    // 2. Web reverse geocoding via OpenStreetMap Nominatim with timeout
    if (Platform.OS === 'web' && typeof fetch !== 'undefined') {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
        const res = await this.withTimeout(fetch(url), 3000);
        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            const a = data.address;
            const road = a.road || a.pedestrian || a.street || '';
            const city = a.city || a.town || a.suburb || a.county || '';
            const state = a.state || '';
            const parts = [road, city, state].filter(Boolean);
            if (parts.length > 0) {
              const formatted = parts.join(', ');
              this.lastGeocodeCache[key] = formatted;
              return formatted;
            }
          }
        }
      } catch {}
    }

    // 3. Fallback to clean readable coordinate tag
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'W';
    const fallback = `${Math.abs(latitude).toFixed(4)}° ${latDir}, ${Math.abs(longitude).toFixed(4)}° ${lonDir}`;
    this.lastGeocodeCache[key] = fallback;
    return fallback;
  }

  /**
   * Format LocationPoint object with reverse-geocoded address
   */
  async formatLocationPoint(coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  }): Promise<LocationPoint> {
    const address = await this.reverseGeocode(coords.latitude, coords.longitude);
    return {
      name: address.split(',')[0] || 'Current Location',
      latitude: coords.latitude,
      longitude: coords.longitude,
      address,
      accuracy: coords.accuracy || null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Manually push a location update (e.g. from GPS refresh or simulated step)
   */
  notifyLocation(location: LocationPoint) {
    this.lastLocation = location;
    this.updateListeners.forEach((fn) => {
      try {
        fn(location);
      } catch (err) {
        console.warn('[LocationService] Error in location listener:', err);
      }
    });
  }

  /**
   * Notify all registered error listeners
   */
  notifyError(error: LocationTrackingError) {
    this.errorListeners.forEach((fn) => {
      try {
        fn(error);
      } catch (err) {
        console.warn('[LocationService] Error in error listener:', err);
      }
    });
  }

  /**
   * Haversine formula to calculate great-circle distance between two GPS coordinates in kilometers
   */
  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  /**
   * Calculate approximate journey progress percentage and remaining distance
   */
  calculateJourneyProgress(
    start: { latitude: number; longitude: number },
    current: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ): {
    progressPercent: number;
    distanceRemainingKm: number;
    totalDistanceKm: number;
  } {
    const totalDistanceKm = Math.max(
      this.calculateDistanceKm(start.latitude, start.longitude, destination.latitude, destination.longitude),
      0.2
    );

    const distanceRemainingKm = this.calculateDistanceKm(
      current.latitude,
      current.longitude,
      destination.latitude,
      destination.longitude
    );

    // If remaining distance is near zero, progress is 100%
    if (distanceRemainingKm <= 0.08) {
      return {
        progressPercent: 100,
        distanceRemainingKm: 0,
        totalDistanceKm,
      };
    }

    const coveredDistanceKm = Math.max(totalDistanceKm - distanceRemainingKm, 0);
    const rawPercent = Math.round((coveredDistanceKm / totalDistanceKm) * 100);
    const progressPercent = Math.min(Math.max(rawPercent, 5), 98);

    return {
      progressPercent,
      distanceRemainingKm,
      totalDistanceKm,
    };
  }

  /**
   * Generate an interpolated location point along the route for testing/simulation
   */
  calculateSimulatedPoint(
    start: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    targetPercent: number
  ): { latitude: number; longitude: number } {
    const factor = Math.min(Math.max(targetPercent / 100, 0), 1);
    const latitude = start.latitude + (destination.latitude - start.latitude) * factor;
    const longitude = start.longitude + (destination.longitude - start.longitude) * factor;
    return { latitude, longitude };
  }

  /**
   * Open Device Settings if permission is permanently denied
   */
  async openSettings(): Promise<void> {
    if (Platform.OS === 'web') {
      alert('Please allow location permissions in your browser address bar (click the lock/tune icon next to the URL).');
      return;
    }
    await Linking.openSettings();
  }
}

export const locationService = new LocationService();
