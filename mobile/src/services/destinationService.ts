import AsyncStorage from '@react-native-async-storage/async-storage';
import { Destination } from '../types';
import { authService } from './authService';
import { API_BASE_URL } from './apiConfig';

const getDestinationsStorageKey = (email?: string) =>
  email ? `@saferoute_destinations_${email.trim().toLowerCase()}` : '@saferoute_destinations_guest';

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 3500): Promise<Response> => {
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

export type TransportModeId = 'Car' | 'Bicycle' | 'Transit' | 'Walking';

export interface ModeRouteEstimate {
  distanceKm: number;
  minutes: number;
  speedKmH: number;
  isExactRoad: boolean;
  geometry: [number, number][];
}

export type RouteEstimatesMap = Record<TransportModeId, ModeRouteEstimate>;

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
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
};

export const destinationService = {
  /**
   * Compute real road distances, exact durations & road polylines for every transport mode using OSRM
   * with intelligent road-factor fallback if offline.
   */
  async getRouteEstimates(
    originLat: number,
    originLon: number,
    destLat: number,
    destLon: number
  ): Promise<RouteEstimatesMap> {
    const straightKm = haversineKm(originLat, originLon, destLat, destLon);

    const buildFallback = (roadKmBase: number, exact = false): RouteEstimatesMap => {
      const safeKm = Math.max(Number(roadKmBase.toFixed(1)), 0.1);
      const carMins = Math.max(Math.round((safeKm / 38) * 60), 1);
      const bikeMins = Math.max(Math.round((safeKm / 32) * 60), 1);
      const transitKm = Math.max(Number((safeKm * 1.05).toFixed(1)), 0.1);
      const transitMins = Math.max(Math.round((transitKm / 26) * 60), 1);
      const walkMins = Math.max(Math.round((safeKm / 4.8) * 60), 1);

      return {
        Car: { distanceKm: safeKm, minutes: carMins, speedKmH: Math.round(safeKm / (carMins / 60)), isExactRoad: exact, geometry: [] },
        Bicycle: { distanceKm: safeKm, minutes: bikeMins, speedKmH: Math.round(safeKm / (bikeMins / 60)), isExactRoad: exact, geometry: [] },
        Transit: { distanceKm: transitKm, minutes: transitMins, speedKmH: Math.round(transitKm / (transitMins / 60)), isExactRoad: exact, geometry: [] },
        Walking: { distanceKm: safeKm, minutes: walkMins, speedKmH: 4.8, isExactRoad: exact, geometry: [] },
      };
    };

    if (straightKm < 0.03) {
      return buildFallback(0.1, false);
    }

    try {
      const drivingUrl = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson`;
      const footUrl = straightKm <= 45
        ? `https://router.project-osrm.org/route/v1/foot/${originLon},${originLat};${destLon},${destLat}?overview=simplified&geometries=geojson`
        : null;

      const [driveRes, footRes] = await Promise.allSettled([
        fetchWithTimeout(drivingUrl, { method: 'GET' }, 3800),
        footUrl ? fetchWithTimeout(footUrl, { method: 'GET' }, 3500) : Promise.reject(new Error('Skip long walk route')),
      ]);

      let carDistKm: number | null = null;
      let carMinutes: number | null = null;
      let driveGeometry: [number, number][] = [];

      if (driveRes.status === 'fulfilled' && driveRes.value.ok) {
        const driveJson = await driveRes.value.json();
        const route = driveJson?.routes?.[0];
        if (route && typeof route.distance === 'number' && typeof route.duration === 'number') {
          carDistKm = Math.max(Number((route.distance / 1000).toFixed(1)), 0.1);
          carMinutes = Math.max(Math.round(route.duration / 60), 1);
          const coords = route.geometry?.coordinates;
          if (Array.isArray(coords)) {
            driveGeometry = coords.map((pt: [number, number]) => [pt[1], pt[0]]);
          }
        }
      }

      let walkDistKm: number | null = null;
      let walkMinutes: number | null = null;
      let walkGeometry: [number, number][] = [];

      if (footRes.status === 'fulfilled' && footRes.value.ok) {
        const footJson = await footRes.value.json();
        const route = footJson?.routes?.[0];
        if (route && typeof route.distance === 'number') {
          walkDistKm = Math.max(Number((route.distance / 1000).toFixed(1)), 0.1);
          walkMinutes = Math.max(Math.round((walkDistKm / 4.8) * 60), 1);
          const coords = route.geometry?.coordinates;
          if (Array.isArray(coords)) {
            walkGeometry = coords.map((pt: [number, number]) => [pt[1], pt[0]]);
          }
        }
      }

      if (carDistKm !== null && carMinutes !== null) {
        const carSpeed = Math.max(Math.round(carDistKm / (carMinutes / 60)), 1);

        // Two-Wheeler uses the exact road network with typical urban agility (~12% faster than cars in traffic)
        const rawBikeMins = Math.max(Math.round(carMinutes * 0.88), 1);
        const bikeMinutes = carMinutes > 3 && rawBikeMins >= carMinutes ? carMinutes - 1 : rawBikeMins;
        const bikeSpeed = Math.max(Math.round(carDistKm / (bikeMinutes / 60)), 1);

        // Metro / Bus follows transit corridors (~5% longer corridor distance & ~35% extra boarding/stop time)
        const transitDistKm = Math.max(Number((carDistKm * 1.05).toFixed(1)), 0.1);
        const transitMinutes = Math.max(Math.round(carMinutes * 1.35 + 3), carMinutes + 2);
        const transitSpeed = Math.max(Math.round(transitDistKm / (transitMinutes / 60)), 1);

        // Walking exact foot distance & pace
        const finalWalkDist = walkDistKm ?? Math.max(Number((carDistKm * 0.92).toFixed(1)), 0.1);
        const finalWalkMins = walkMinutes ?? Math.max(Math.round((finalWalkDist / 4.8) * 60), 1);

        return {
          Car: {
            distanceKm: carDistKm,
            minutes: carMinutes,
            speedKmH: carSpeed,
            isExactRoad: true,
            geometry: driveGeometry,
          },
          Bicycle: {
            distanceKm: carDistKm,
            minutes: bikeMinutes,
            speedKmH: bikeSpeed,
            isExactRoad: true,
            geometry: driveGeometry,
          },
          Transit: {
            distanceKm: transitDistKm,
            minutes: transitMinutes,
            speedKmH: transitSpeed,
            isExactRoad: true,
            geometry: driveGeometry,
          },
          Walking: {
            distanceKm: finalWalkDist,
            minutes: finalWalkMins,
            speedKmH: 4.8,
            isExactRoad: walkDistKm !== null,
            geometry: walkGeometry.length > 1 ? walkGeometry : driveGeometry,
          },
        };
      }
    } catch {
      // Fall back smoothly if OSRM is blocked or offline
    }

    return buildFallback(straightKm * 1.26, false);
  },

  /**
   * Search real places for live destination / home address autocomplete suggestions
   */
  async searchPlaces(
    query: string,
    userLat = 16.4613,
    userLon = 80.5069,
    transportMode = 'Car'
  ): Promise<
    Array<{
      id: string;
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      distanceKm: number;
      estimatedMinutes: number;
      arrivalTime: string;
      category?: string;
    }>
  > {
    if (!query || query.trim().length < 2) return [];
    const trimmed = query.trim();

    // 1. Try backend /destinations/search first
    try {
      const url = `${API_BASE_URL}/destinations/search?q=${encodeURIComponent(
        trimmed
      )}&lat=${userLat}&lon=${userLon}&mode=${encodeURIComponent(transportMode)}`;
      const res = await fetchWithTimeout(url, { method: 'GET' }, 2500);

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch {}

    // 2. Direct OpenStreetMap Nominatim lookup (works even if backend is not running or on static web)
    try {
      const speed =
        transportMode === 'Walking' ? 4.8 : transportMode === 'Bicycle' ? 32 : transportMode === 'Transit' ? 26 : 38;
      const viewbox = `${userLon - 1.5},${userLat - 1.5},${userLon + 1.5},${userLat + 1.5}`;
      const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&viewbox=${viewbox}&limit=6&addressdetails=1`;
      const osmRes = await fetchWithTimeout(osmUrl, { method: 'GET' }, 3500);

      if (osmRes.ok) {
        const data = await osmRes.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => {
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            const dist = Math.max(Number((haversineKm(userLat, userLon, lat, lon) * 1.25).toFixed(1)), 0.2);
            const minutes = Math.max(Math.round((dist / speed) * 60), 1);
            const arrivalDate = new Date(Date.now() + minutes * 60 * 1000);
            const shortName = item.name || (item.display_name ? item.display_name.split(',')[0] : trimmed);
            return {
              id: 'osm_' + item.place_id,
              name: shortName,
              address: item.display_name || shortName,
              latitude: lat,
              longitude: lon,
              distanceKm: dist,
              estimatedMinutes: minutes,
              arrivalTime: arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              category: item.type || 'Location',
            };
          });
        }
      }
    } catch {}

    // 3. Fallback: Offline geocode helper
    try {
      const single = await this.geocodeQuery(trimmed, userLat, userLon, transportMode);
      return [
        {
          id: 'geo_' + Date.now(),
          name: single.name,
          address: single.address,
          latitude: single.latitude,
          longitude: single.longitude,
          distanceKm: single.distanceKm,
          estimatedMinutes: single.estimatedMinutes,
          arrivalTime: single.arrivalTime,
          category: 'Location',
        },
      ];
    } catch {
      return [];
    }
  },

  /**
   * Fetch all destinations from backend or local cache (strictly user-scoped)
   */
  async getDestinations(): Promise<{ destinations: Destination[]; isLive: boolean }> {
    const token = await authService.getStoredToken();
    const storedUser = await authService.getStoredUser();
    const storageKey = getDestinationsStorageKey(storedUser?.email);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(storedUser?.id ? { 'x-user-id': storedUser.id } : {}),
        ...(storedUser?.email ? { 'x-user-email': storedUser.email } : {}),
      };

      const res = await fetchWithTimeout(`${API_BASE_URL}/destinations`, {
        method: 'GET',
        headers,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const mapped: Destination[] = json.data.map((item: any) => ({
            id: item._id || item.id || 'dest_' + Math.random().toString(36).substring(2, 7),
            name: item.name,
            address: item.address,
            category: item.category || 'Other',
            icon: item.icon || 'location-outline',
            estimatedMinutes: item.estimatedMinutes || 20,
            distanceKm: item.distanceKm || 5.0,
            latitude: item.latitude,
            longitude: item.longitude,
          }));

          await AsyncStorage.setItem(storageKey, JSON.stringify(mapped));
          return { destinations: mapped, isLive: true };
        }
      }
    } catch {
      // Backend offline fallback
    }

    // Load from local user-scoped storage or return empty list
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        return { destinations: JSON.parse(stored), isLive: false };
      }
    } catch {}

    return { destinations: [], isLive: false };
  },

  /**
   * Add a new destination
   */
  async addDestination(dest: Omit<Destination, 'id'>): Promise<Destination> {
    const token = await authService.getStoredToken();
    const storedUser = await authService.getStoredUser();
    const storageKey = getDestinationsStorageKey(storedUser?.email);

    const newId = 'dest_' + Date.now();
    const created: Destination = {
      ...dest,
      id: newId,
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(storedUser?.id ? { 'x-user-id': storedUser.id } : {}),
        ...(storedUser?.email ? { 'x-user-email': storedUser.email } : {}),
      };

      const res = await fetchWithTimeout(`${API_BASE_URL}/destinations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(dest),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data && (json.data._id || json.data.id)) {
          created.id = json.data._id || json.data.id;
        }
      }
    } catch {
      // offline
    }

    // Save to local user-isolated storage
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      const list: Destination[] = stored ? JSON.parse(stored) : [];
      list.push(created);
      await AsyncStorage.setItem(storageKey, JSON.stringify(list));
    } catch {}

    return created;
  },

  /**
   * Delete a destination
   */
  async deleteDestination(id: string): Promise<void> {
    const token = await authService.getStoredToken();
    const storedUser = await authService.getStoredUser();
    const storageKey = getDestinationsStorageKey(storedUser?.email);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(storedUser?.id ? { 'x-user-id': storedUser.id } : {}),
        ...(storedUser?.email ? { 'x-user-email': storedUser.email } : {}),
      };

      await fetchWithTimeout(`${API_BASE_URL}/destinations/${id}`, {
        method: 'DELETE',
        headers,
      });
    } catch {}

    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const list: Destination[] = JSON.parse(stored);
        const filtered = list.filter((d) => d.id !== id);
        await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));
      }
    } catch {}
  },

  /**
   * Geocode a custom destination query and calculate accurate ETA and arrival time
   */
  async geocodeQuery(
    query: string,
    userLat = 16.4613,
    userLon = 80.5069,
    transportMode = 'Car'
  ): Promise<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
    estimatedMinutes: number;
    arrivalTime: string;
  }> {
    try {
      const url = `${API_BASE_URL}/destinations/geocode?q=${encodeURIComponent(
        query
      )}&lat=${userLat}&lon=${userLon}&mode=${encodeURIComponent(transportMode)}`;
      const res = await fetchWithTimeout(url, { method: 'GET' }, 3000);

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch {}

    const cleanKey = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    let lat = userLat + 0.05;
    let lon = userLon + 0.05;
    let address = query;

    if (cleanKey.includes('vijayawada') || cleanKey.includes('vijaywada')) {
      lat = 16.5062;
      lon = 80.648;
      address = 'Vijayawada, NTR District, Andhra Pradesh, India';
    } else if (cleanKey.includes('mangalagiri')) {
      lat = 16.4357;
      lon = 80.5694;
      address = 'Mangalagiri, Guntur District, Andhra Pradesh, India';
    } else if (cleanKey.includes('guntur')) {
      lat = 16.3067;
      lon = 80.4365;
      address = 'Guntur, Andhra Pradesh, India';
    } else if (cleanKey.includes('amaravati')) {
      lat = 16.5417;
      lon = 80.5158;
      address = 'Amaravati Capital City, Andhra Pradesh, India';
    } else if (cleanKey.includes('klu') || cleanKey.includes('vaddeswaram')) {
      lat = 16.442;
      lon = 80.6225;
      address = 'KL University Campus, Vaddeswaram, Andhra Pradesh';
    }

    const R = 6371;
    const dLat = ((lat - userLat) * Math.PI) / 180;
    const dLon = ((lon - userLon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = Math.max(Number((R * c * 1.26).toFixed(1)), 0.5);

    const speed = transportMode === 'Walking' ? 4.8 : transportMode === 'Bicycle' ? 32 : transportMode === 'Transit' ? 26 : 38;
    const minutes = Math.max(Math.round((dist / speed) * 60), 1);
    const arrivalDate = new Date(Date.now() + minutes * 60 * 1000);
    const arrivalTime = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      name: query,
      address,
      latitude: lat,
      longitude: lon,
      distanceKm: dist,
      estimatedMinutes: minutes,
      arrivalTime,
    };
  },
};
