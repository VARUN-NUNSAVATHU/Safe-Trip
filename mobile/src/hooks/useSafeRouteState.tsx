import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  ActiveTripState,
  Destination,
  FamilyContact,
  HomeZone,
  LocationPoint,
  LocationTrackingError,
  TripHistoryItem,
  UserProfile,
} from '../types';
import {
  INITIAL_CONTACTS,
  INITIAL_DESTINATIONS,
  INITIAL_HOME_ZONE,
  INITIAL_TRIP_HISTORY,
} from '../utils/mockData';
import { storage } from '../services/storage';
import { geofenceService, addGeofenceExitListener } from '../services/geofenceService';
import { notificationService } from '../services/notificationService';
import { tripService } from '../services/tripService';
import { locationService } from '../services/locationService';
import { authService } from '../services/authService';
import { contactService } from '../services/contactService';
import { destinationService } from '../services/destinationService';

interface SafeRouteContextType {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  token: string | null;
  isAuthenticated: boolean;
  isCloudSynced: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, phone: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  homeZone: HomeZone;
  updateHomeZone: (newZone: Partial<HomeZone>) => void;
  destinations: Destination[];
  addDestination: (dest: Omit<Destination, 'id'>) => void;
  deleteDestination: (id: string) => Promise<void>;
  contacts: FamilyContact[];
  addContact: (contact: Omit<FamilyContact, 'id'>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  refreshContacts: () => Promise<void>;
  toggleContactDeparture: (id: string) => void;
  toggleContactArrival: (id: string) => void;
  activeTrip: ActiveTripState | null;
  startTrip: (
    destination: Destination | LocationPoint,
    transportMode?: ActiveTripState['transportMode'],
    customStartLocation?: LocationPoint
  ) => Promise<void>;
  completeActiveTrip: () => Promise<void>;
  cancelActiveTrip: () => Promise<void>;
  tripHistory: TripHistoryItem[];
  clearTripHistory: () => Promise<void>;
  deleteTripRecord: (id: string) => Promise<void>;
  isGeofenceAlertVisible: boolean;
  isGeofenceMonitoring: boolean;
  toggleGeofenceMonitoring: (enable: boolean) => Promise<boolean>;
  triggerGeofenceExitAlert: () => void;
  dismissGeofenceAlert: () => void;
  confirmTripFromAlert: () => void;
  locationTrackingError: LocationTrackingError | null;
  clearLocationError: () => void;
  retryLocationTracking: () => Promise<void>;
  lastCompletedTripDetails: {
    destinationName: string;
    elapsedMinutes: number;
    distanceKm: number;
  } | null;
  clearCompletedTripDetails: () => void;
  updateActiveTripLocation: (location: LocationPoint) => void;
  advanceTripSimulation: (percentStep?: number) => void;
  settings: {
    alarmSoundEnabled: boolean;
    vibrationEnabled: boolean;
    autoPromptOnExit: boolean;
    autoNotifyTimerSeconds: number;
    sensitivity: 'HIGH' | 'BALANCED' | 'BATTERY_SAVER';
  };
  updateSettings: (newSettings: any) => void;
}

export const getTripHistoryStorageKey = (email?: string): string => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  return normalizedEmail ? `@saferoute_trip_history_${normalizedEmail}` : '@saferoute_trip_history_guest';
};

export const getContactsStorageKey = (email?: string): string => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  return normalizedEmail ? `@saferoute_contacts_${normalizedEmail}` : '@saferoute_contacts_guest';
};

export const getHomeZoneStorageKey = (email?: string): string => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  return normalizedEmail ? `@saferoute_home_zone_${normalizedEmail}` : '@saferoute_home_zone_guest';
};

export const getDestinationsStorageKey = (email?: string): string => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  return normalizedEmail ? `@saferoute_destinations_${normalizedEmail}` : '@saferoute_destinations_guest';
};

export const formatTripDate = (dateInput?: Date | string | number): string => {
  if (!dateInput) {
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return `Today, ${time}`;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Today';

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[d.getMonth()]} ${d.getDate()}, ${timeStr}`;
};

const SafeRouteContext = createContext<SafeRouteContextType | undefined>(undefined);

export const SafeRouteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
  });
  const [token, setToken] = useState<string | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [homeZone, setHomeZone] = useState<HomeZone>(INITIAL_HOME_ZONE);
  const [destinations, setDestinations] = useState<Destination[]>(INITIAL_DESTINATIONS);
  const [contacts, setContacts] = useState<FamilyContact[]>([]);
  const [tripHistory, setTripHistory] = useState<TripHistoryItem[]>([]);
  const [activeTrip, setActiveTrip] = useState<ActiveTripState | null>(null);
  const [isGeofenceAlertVisible, setIsGeofenceAlertVisible] = useState<boolean>(false);
  const [isGeofenceMonitoring, setIsGeofenceMonitoring] = useState<boolean>(true);
  const [locationTrackingError, setLocationTrackingError] = useState<LocationTrackingError | null>(null);
  const [settings, setSettings] = useState({
    alarmSoundEnabled: true,
    vibrationEnabled: true,
    autoPromptOnExit: true,
    autoNotifyTimerSeconds: 60,
    sensitivity: 'BALANCED' as const,
  });
  const [lastCompletedTripDetails, setLastCompletedTripDetails] = useState<{
    destinationName: string;
    elapsedMinutes: number;
    distanceKm: number;
  } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const openAuthModal = useCallback((tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);
  const isCompletingRef = useRef<boolean>(false);
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const activeTripRef = useRef<ActiveTripState | null>(null);
  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  const clearCompletedTripDetails = useCallback(() => {
    setLastCompletedTripDetails(null);
  }, []);

  /**
   * Automatically complete trip when arriving at destination geofence perimeter
   */
  const handleAutoDestinationArrival = useCallback(
    async (trip: ActiveTripState, finalLoc: LocationPoint) => {
      console.log(
        `[SafeRouteProvider] Reached destination perimeter for "${trip.destination.name}"! Completing trip automatically.`
      );

      // 1. Stop active location tracking immediately (zero battery drain)
      await locationService.stopActiveTripTracking();

      // 2. Complete trip service
      await tripService.completeTrip(trip.id, finalLoc);

      // 3. Trigger local arrival notification
      await notificationService
        .showDestinationArrivalNotification(trip.destination.name)
        .catch(console.warn);

      const startTimeMs = trip.startTime
        ? new Date(trip.startTime).getTime()
        : trip.startedAt
        ? new Date(trip.startedAt).getTime()
        : Date.now();
      const elapsed = Math.max(Math.round((Date.now() - startTimeMs) / 60000), 1);

      let distance = trip.destination.distanceKm;
      if (!distance || distance <= 0) {
        distance = locationService.calculateDistanceKm(
          trip.startLocation.latitude,
          trip.startLocation.longitude,
          finalLoc.latitude,
          finalLoc.longitude
        );
      }
      if (!distance || distance <= 0) distance = 3.8;

      const details = {
        destinationName: trip.destination.name,
        elapsedMinutes: elapsed,
        distanceKm: parseFloat(distance.toFixed(1)),
      };

      const historyItem: TripHistoryItem = {
        id: trip.id || 'hist_' + Date.now(),
        destinationName: trip.destination.name,
        destinationAddress: trip.destination.address || `${trip.destination.name}, Vijayawada`,
        date: formatTripDate(new Date()),
        durationMinutes: details.elapsedMinutes,
        distanceKm: details.distanceKm,
        status: 'COMPLETED',
        contactsNotifiedCount: trip.notifiedContacts?.length || 2,
      };

      setTripHistory((prev) => {
        const idx = prev.findIndex((item) => item.id === trip.id || item.status === 'ACTIVE');
        let next: TripHistoryItem[];
        if (idx >= 0) {
          next = [...prev];
          next[idx] = historyItem;
        } else {
          next = [historyItem, ...prev];
        }
        const userKey = getTripHistoryStorageKey(userRef.current.email);
        storage.saveItem(userKey, next);
        return next;
      });
      setActiveTrip(null);
      setLocationTrackingError(null);
      setLastCompletedTripDetails(details);
    },
    []
  );

  /**
   * Handle incoming periodic location update for an active trip
   */
  const handleLocationUpdate = useCallback(
    (newLoc: LocationPoint) => {
      setLocationTrackingError(null);

      setActiveTrip((prev) => {
        if (!prev) return null;

        const destCoords = {
          latitude: prev.destination.latitude || 37.4275,
          longitude: prev.destination.longitude || -122.1697,
        };

        const startCoords = {
          latitude: prev.startLocation.latitude,
          longitude: prev.startLocation.longitude,
        };

        const progressMetrics = locationService.calculateJourneyProgress(
          startCoords,
          { latitude: newLoc.latitude, longitude: newLoc.longitude },
          destCoords
        );

        // Check for automated destination arrival (within 100m or completed progress)
        if (!isCompletingRef.current && progressMetrics.distanceRemainingKm <= 0.1) {
          isCompletingRef.current = true;
          handleAutoDestinationArrival(prev, newLoc);
          return null;
        }

        // Async sync to backend / local storage
        tripService.updateLiveLocation(prev.id, newLoc).catch(() => {});

        return {
          ...prev,
          currentLocation: newLoc,
          distanceRemainingKm: progressMetrics.distanceRemainingKm,
          journeyProgressPercent: progressMetrics.progressPercent,
          lastLocationUpdate: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        };
      });
    },
    [handleAutoDestinationArrival]
  );

  const handleLocationError = useCallback((err: LocationTrackingError) => {
    console.warn('[SafeRouteProvider] Location tracking error received:', err);
    setLocationTrackingError(err);
  }, []);

  useEffect(() => {
    // 0. Initialize authentication session & cloud contacts
    authService.getStoredUser().then(async (cachedUser) => {
      if (cachedUser && cachedUser.email) {
        setUser(cachedUser);
        const userKey = getTripHistoryStorageKey(cachedUser.email);
        const savedHistory = await storage.getItem<TripHistoryItem[]>(userKey);
        setTripHistory(savedHistory || []);

        const userContactKey = getContactsStorageKey(cachedUser.email);
        const contactData = await contactService.getContacts();
        if (contactData.contacts && contactData.contacts.length > 0) {
          setContacts(contactData.contacts);
          await storage.saveItem(userContactKey, contactData.contacts);
        } else {
          const cachedContacts = await storage.getItem<FamilyContact[]>(userContactKey);
          setContacts(cachedContacts || []);
        }

        // Load persisted user-scoped home zone
        const userHomeKey = getHomeZoneStorageKey(cachedUser.email);
        const savedHome = await storage.getItem<HomeZone>(userHomeKey);
        if (savedHome) {
          setHomeZone(savedHome);
          geofenceService.startHomeGeofencing(savedHome).catch(console.warn);
        }

        if (contactData.isLive) setIsCloudSynced(true);
      } else {
        setTripHistory([]);
        setContacts([]);
      }
    });
    authService.getStoredToken().then((cachedToken) => {
      if (cachedToken) setToken(cachedToken);
    });
    authService.checkHealth().then((healthy) => {
      setIsCloudSynced(healthy);
    });
    destinationService.getDestinations().then(({ destinations: loadedDests, isLive }) => {
      if (loadedDests && loadedDests.length > 0) {
        setDestinations(loadedDests);
        storage.saveItem('@saferoute_destinations', loadedDests);
      } else {
        storage.getItem<Destination[]>('@saferoute_destinations').then((saved) => {
          if (saved && saved.length > 0) setDestinations(saved);
        });
      }
      if (isLive) setIsCloudSynced(true);
    });

    // 1. Setup notification channels and categories
    notificationService.setupNotificationCategories().catch(console.warn);

    // 2. Check if geofencing is active
    geofenceService.isGeofencingActive().then((active) => {
      setIsGeofenceMonitoring(active);
    });

    // 3. Restore any active trip from persistent storage for this user and resume live tracking
    authService.getStoredUser().then((cachedUser) => {
      tripService.getActiveTrip(cachedUser?.email).then((savedTrip) => {
      if (savedTrip && savedTrip.status === 'ACTIVE') {
        let destLat = savedTrip.destination.latitude;
        let destLon = savedTrip.destination.longitude;

        let totalDist = locationService.calculateDistanceKm(
          savedTrip.startLocation.latitude,
          savedTrip.startLocation.longitude,
          destLat,
          destLon
        );

        // Sanitize legacy California coordinates if trip exceeds realistic city distance
        if (totalDist > 300) {
          const clean = (savedTrip.destination.name || '').toLowerCase();
          if (clean.includes('vijaywada') || clean.includes('vijayawada')) {
            destLat = 16.5062;
            destLon = 80.648;
          } else {
            destLat = savedTrip.startLocation.latitude + 0.05;
            destLon = savedTrip.startLocation.longitude + 0.05;
          }
          savedTrip.destination.latitude = destLat;
          savedTrip.destination.longitude = destLon;
          totalDist = locationService.calculateDistanceKm(
            savedTrip.startLocation.latitude,
            savedTrip.startLocation.longitude,
            destLat,
            destLon
          );
        }

        const dest: Destination = {
          id: 'dest_saved',
          name: savedTrip.destination.name,
          address: savedTrip.destination.address || '',
          category: 'College',
          icon: 'location-outline',
          estimatedMinutes: savedTrip.estimatedMinutes || 25,
          distanceKm: totalDist,
          latitude: destLat,
          longitude: destLon,
        };

        const restored: ActiveTripState = {
          id: savedTrip.id,
          userId: savedTrip.userId,
          startLocation: savedTrip.startLocation,
          destination: dest,
          currentLocation: savedTrip.currentLocation || savedTrip.startLocation,
          transportMode: (savedTrip.transportMode as any) || 'Transit',
          startTime: savedTrip.startTime,
          startedAt: new Date(savedTrip.startTime),
          estimatedArrivalMinutes: savedTrip.estimatedMinutes || 25,
          elapsedMinutes: Math.max(Math.round((Date.now() - new Date(savedTrip.startTime).getTime()) / 60000), 1),
          distanceRemainingKm: totalDist,
          journeyProgressPercent: 10,
          status: 'ACTIVE',
          notifiedContacts: savedTrip.contactsNotified || ['Mom', 'Dad'],
          lastLocationUpdate: 'Just now',
        };

        setActiveTrip(restored);
        // Start battery-optimized tracking for the active trip
        locationService.startActiveTripTracking(handleLocationUpdate, handleLocationError);
      } else {
        // Guarantee zero location tracking when no active trip exists
        locationService.stopActiveTripTracking();
      }
      });
    });

    // 5. Subscribe to geofence EXIT events (handles both foreground and background wake-up)
    const unsubscribeExit = addGeofenceExitListener(() => {
      console.log('[SafeRouteProvider] Geofence exit detected. Triggering alarm modal...');
      setHomeZone((prev) => ({ ...prev, isInside: false }));
      setIsGeofenceAlertVisible(true);
    });

    return () => {
      unsubscribeExit();
      locationService.stopActiveTripTracking();
    };
  }, [handleLocationUpdate, handleLocationError]);

  // 6. Smooth Live Motion Ticker: advances vehicle position smoothly along route when trip is active
  useEffect(() => {
    if (!activeTrip || activeTrip.status !== 'ACTIVE') return;

    const timer = setInterval(() => {
      const trip = activeTripRef.current;
      if (!trip || trip.status !== 'ACTIVE' || isCompletingRef.current) return;

      const currentProgress = trip.journeyProgressPercent || 5;
      if (currentProgress >= 100) return;

      // Smooth step forward along the route
      const nextProgress = Math.min(currentProgress + 2.5, 100);

      const destCoords = {
        latitude: trip.destination.latitude || 16.5062,
        longitude: trip.destination.longitude || 80.648,
      };
      const startCoords = {
        latitude: trip.startLocation.latitude,
        longitude: trip.startLocation.longitude,
      };

      const simCoords = locationService.calculateSimulatedPoint(startCoords, destCoords, nextProgress);
      const latDir = simCoords.latitude >= 0 ? 'N' : 'S';
      const lonDir = simCoords.longitude >= 0 ? 'E' : 'W';
      const simulatedPoint: LocationPoint = {
        name: nextProgress >= 100 ? trip.destination.name : `En Route (${Math.round(nextProgress)}%)`,
        address:
          nextProgress >= 100
            ? trip.destination.address || 'Destination'
            : `${Math.abs(simCoords.latitude).toFixed(4)}° ${latDir}, ${Math.abs(simCoords.longitude).toFixed(4)}° ${lonDir}`,
        latitude: simCoords.latitude,
        longitude: simCoords.longitude,
        accuracy: 6,
        timestamp: new Date().toISOString(),
      };

      handleLocationUpdate(simulatedPoint);
    }, 3500);

    return () => clearInterval(timer);
  }, [activeTrip?.id, activeTrip?.status, handleLocationUpdate]);

  const updateHomeZone = (newZone: Partial<HomeZone>) => {
    setHomeZone((prev) => {
      const updated = { ...prev, ...newZone };
      const homeKey = getHomeZoneStorageKey(userRef.current.email);
      storage.saveItem(homeKey, updated);

      if (isGeofenceMonitoring) {
        geofenceService.startHomeGeofencing(updated).catch(console.warn);
      }
      return updated;
    });
  };

  const toggleGeofenceMonitoring = async (enable: boolean): Promise<boolean> => {
    if (enable) {
      const permissions = await geofenceService.requestAllPermissions();
      if (!permissions.foregroundGranted) {
        return false;
      }
      const success = await geofenceService.startHomeGeofencing(homeZone);
      setIsGeofenceMonitoring(success);
      return success;
    } else {
      const success = await geofenceService.stopHomeGeofencing();
      setIsGeofenceMonitoring(!success ? true : false);
      return success;
    }
  };

  const addDestination = async (dest: Omit<Destination, 'id'>) => {
    const userDestKey = getDestinationsStorageKey(userRef.current.email);
    try {
      const created = await destinationService.addDestination(dest);
      setDestinations((prev) => {
        const next = [created, ...prev];
        storage.saveItem(userDestKey, next);
        return next;
      });
    } catch {
      const fallback: Destination = { ...dest, id: 'dest_' + Date.now() };
      setDestinations((prev) => {
        const next = [fallback, ...prev];
        storage.saveItem(userDestKey, next);
        return next;
      });
    }
  };

  const deleteDestination = async (id: string) => {
    const userDestKey = getDestinationsStorageKey(userRef.current.email);
    try {
      await destinationService.deleteDestination(id);
    } catch (e) {
      console.warn('[SafeRouteProvider] Server delete destination error:', e);
    }
    setDestinations((prev) => {
      const next = prev.filter((d) => d.id !== id);
      storage.saveItem(userDestKey, next);
      storage.saveItem('@saferoute_destinations', next);
      return next;
    });
  };

  const addContact = async (contact: Omit<FamilyContact, 'id'>) => {
    try {
      const newContact = await contactService.addContact(contact);
      setContacts((prev) => {
        const next = [...prev, newContact];
        const userKey = getContactsStorageKey(userRef.current.email);
        storage.saveItem(userKey, next);
        return next;
      });
    } catch (e) {
      console.warn('[SafeRouteProvider] Error adding contact:', e);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      await contactService.deleteContact(id);
      setContacts((prev) => {
        const next = prev.filter((c) => c.id !== id);
        const userKey = getContactsStorageKey(userRef.current.email);
        storage.saveItem(userKey, next);
        return next;
      });
    } catch (e) {
      console.warn('[SafeRouteProvider] Error deleting contact:', e);
    }
  };

  const refreshContacts = async () => {
    try {
      const result = await contactService.getContacts();
      setContacts(result.contacts);
      const userKey = getContactsStorageKey(userRef.current.email);
      storage.saveItem(userKey, result.contacts);
      setIsCloudSynced(result.isLive);
    } catch (e) {
      console.warn('[SafeRouteProvider] Error refreshing contacts:', e);
    }
  };

  const toggleContactDeparture = (id: string) => {
    setContacts((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, notifyOnDeparture: !c.notifyOnDeparture } : c));
      const target = updated.find((c) => c.id === id);
      if (target) {
        contactService.updateContactPreferences(id, { notifyOnDeparture: target.notifyOnDeparture });
      }
      const userKey = getContactsStorageKey(userRef.current.email);
      storage.saveItem(userKey, updated);
      return updated;
    });
  };

  const toggleContactArrival = (id: string) => {
    setContacts((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, notifyOnArrival: !c.notifyOnArrival } : c));
      const target = updated.find((c) => c.id === id);
      if (target) {
        contactService.updateContactPreferences(id, { notifyOnArrival: target.notifyOnArrival });
      }
      const userKey = getContactsStorageKey(userRef.current.email);
      storage.saveItem(userKey, updated);
      return updated;
    });
  };

  /**
   * Start Trip implementation:
   * - Creates active trip
   * - Stores start time
   * - Stores start location
   * - Sets selected destination
   * - Starts live location tracking
   * - Changes dashboard status to "TRIP ACTIVE"
   */
  const startTrip = async (
    destination: Destination | LocationPoint,
    transportMode: ActiveTripState['transportMode'] = 'Transit',
    customStartLocation?: LocationPoint
  ) => {
    const startLoc: LocationPoint = customStartLocation || {
      name: homeZone.name || 'Home',
      latitude: homeZone.latitude,
      longitude: homeZone.longitude,
      address: homeZone.address,
    };

    // Determine realistic destination coordinates
    let destLat = 'latitude' in destination && destination.latitude ? destination.latitude : 0;
    let destLon = 'longitude' in destination && destination.longitude ? destination.longitude : 0;

    // Check if coordinates are invalid or defaulted to California while user is elsewhere
    const isLegacyPaloAlto = Math.abs(destLat - 37.4275) < 0.05 && Math.abs(destLon - -122.1697) < 0.05;
    const isInvalidCoords = !destLat || !destLon || (isLegacyPaloAlto && Math.abs(startLoc.latitude - 16.46) < 15);

    if (isInvalidCoords) {
      const cleanName = destination.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanName.includes('vijayawada') || cleanName.includes('vijaywada')) {
        destLat = 16.5062;
        destLon = 80.648;
      } else if (cleanName.includes('mangalagiri')) {
        destLat = 16.4357;
        destLon = 80.5694;
      } else if (cleanName.includes('guntur')) {
        destLat = 16.3067;
        destLon = 80.4365;
      } else if (cleanName.includes('amaravati')) {
        destLat = 16.5417;
        destLon = 80.5158;
      } else if (cleanName.includes('klu') || cleanName.includes('vaddeswaram')) {
        destLat = 16.442;
        destLon = 80.6225;
      } else {
        // Sensible local offset (~8-12 km away from departure origin)
        destLat = startLoc.latitude + 0.06;
        destLon = startLoc.longitude + 0.06;
      }
    }

    const destPoint: LocationPoint = {
      name: destination.name,
      latitude: destLat,
      longitude: destLon,
      address: destination.address || `${destLat.toFixed(4)}°, ${destLon.toFixed(4)}°`,
    };

    const notifiedNames = contacts
      .filter((c) => c.notifyOnDeparture)
      .map((c) => c.name.split(' ')[0]);

    const totalDistKm =
      'distanceKm' in destination && typeof destination.distanceKm === 'number' && destination.distanceKm > 0
        ? Number(destination.distanceKm.toFixed(1))
        : locationService.calculateDistanceKm(
            startLoc.latitude,
            startLoc.longitude,
            destPoint.latitude,
            destPoint.longitude
          );

    // Calculate realistic travel time based on transport mode and distance: (Distance / Speed) * 60
    const speed = transportMode === 'Walking' ? 4.8 : transportMode === 'Bicycle' ? 32 : transportMode === 'Transit' ? 26 : 38;
    const computedEstMinutes = Math.max(Math.round((totalDistKm / speed) * 60), 1);

    const estimatedMinutes =
      'estimatedMinutes' in destination && typeof destination.estimatedMinutes === 'number' && destination.estimatedMinutes > 0
        ? destination.estimatedMinutes
        : computedEstMinutes;

    const passedRoutePath =
      'routePath' in destination && Array.isArray(destination.routePath) ? destination.routePath : undefined;

    // 1. Create trip record & persist
    const tripRecord = await tripService.startTrip({
      userId: user.id || user.email || 'user_1',
      startLocation: startLoc,
      destination: destPoint,
      transportMode,
      estimatedMinutes,
      contactsNotified: notifiedNames,
    });

    const activeState: ActiveTripState = {
      id: tripRecord.id,
      userId: tripRecord.userId,
      startLocation: startLoc,
      destination: {
        id: 'dest_' + Date.now(),
        name: destPoint.name,
        address: destPoint.address || '',
        category: 'College',
        icon: 'location-outline',
        estimatedMinutes,
        distanceKm: totalDistKm,
        latitude: destLat,
        longitude: destLon,
      },
      currentLocation: startLoc,
      transportMode,
      startTime: tripRecord.startTime,
      startedAt: new Date(tripRecord.startTime),
      estimatedArrivalMinutes: estimatedMinutes,
      elapsedMinutes: 0,
      distanceRemainingKm: totalDistKm,
      journeyProgressPercent: 5,
      status: 'ACTIVE',
      notifiedContacts: notifiedNames,
      lastLocationUpdate: 'Trip just started',
      routePath: passedRoutePath,
    };

    // 2. Set dashboard status to TRIP ACTIVE
    isCompletingRef.current = false;
    setLastCompletedTripDetails(null);
    setActiveTrip(activeState);
    setHomeZone((prev) => ({ ...prev, isInside: false }));
    setIsGeofenceAlertVisible(false);
    setLocationTrackingError(null);

    // Add ACTIVE item to trip history so records immediately show ACTIVE
    const activeHistoryItem: TripHistoryItem = {
      id: tripRecord.id,
      destinationName: destPoint.name,
      destinationAddress: destPoint.address || `${destPoint.name}, Vijayawada`,
      date: formatTripDate(new Date()),
      durationMinutes: 1,
      distanceKm: parseFloat(totalDistKm.toFixed(1)),
      status: 'ACTIVE',
      contactsNotifiedCount: notifiedNames.length,
    };

    setTripHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== tripRecord.id && item.status !== 'ACTIVE');
      const next = [activeHistoryItem, ...filtered];
      const userKey = getTripHistoryStorageKey(userRef.current.email);
      storage.saveItem(userKey, next);
      return next;
    });

    // 3. Start live location tracking (battery-optimized: 10s / 25m interval)
    await locationService.startActiveTripTracking(handleLocationUpdate, handleLocationError);
  };

  /**
   * Complete active trip:
   * - Stops location tracking immediately
   * - Records arrival & notifies family
   * - Resets dashboard status to SAFE
   */
  const completeActiveTrip = async () => {
    if (!activeTrip || isCompletingRef.current) return;
    isCompletingRef.current = true;

    // 1. Stop location tracking immediately (zero battery drain)
    await locationService.stopActiveTripTracking();

    // 2. Complete trip service
    await tripService.completeTrip(activeTrip.id, activeTrip.currentLocation);

    const startTimeMs = activeTrip.startTime
      ? new Date(activeTrip.startTime).getTime()
      : activeTrip.startedAt
      ? new Date(activeTrip.startedAt).getTime()
      : Date.now();
    const elapsed = Math.max(
      Math.round((Date.now() - startTimeMs) / 60000),
      activeTrip.elapsedMinutes > 0 ? activeTrip.elapsedMinutes : 1
    );

    let distance = activeTrip.destination.distanceKm;
    if (!distance || distance <= 0) {
      distance = locationService.calculateDistanceKm(
        activeTrip.startLocation.latitude,
        activeTrip.startLocation.longitude,
        activeTrip.currentLocation.latitude,
        activeTrip.currentLocation.longitude
      );
    }
    if (!distance || distance <= 0) distance = 4.2;

    const details = {
      destinationName: activeTrip.destination.name,
      elapsedMinutes: elapsed,
      distanceKm: parseFloat(distance.toFixed(1)),
    };

    const historyItem: TripHistoryItem = {
      id: activeTrip.id || 'hist_' + Date.now(),
      destinationName: activeTrip.destination.name,
      destinationAddress: activeTrip.destination.address || `${activeTrip.destination.name}, Vijayawada`,
      date: formatTripDate(new Date()),
      durationMinutes: details.elapsedMinutes,
      distanceKm: details.distanceKm,
      status: 'COMPLETED',
      contactsNotifiedCount: activeTrip.notifiedContacts?.length || 2,
    };

    setTripHistory((prev) => {
      const idx = prev.findIndex((item) => item.id === activeTrip.id || item.status === 'ACTIVE');
      let next: TripHistoryItem[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = historyItem;
      } else {
        next = [historyItem, ...prev];
      }
      const userKey = getTripHistoryStorageKey(userRef.current.email);
      storage.saveItem(userKey, next);
      return next;
    });
    setActiveTrip(null);
    setLocationTrackingError(null);
    setLastCompletedTripDetails(details);
  };

  /**
   * Cancel active trip (Stop Trip):
   * - Stops location tracking immediately
   * - Marks trip CANCELLED
   */
  const cancelActiveTrip = async () => {
    isCompletingRef.current = false;
    if (activeTrip) {
      await locationService.stopActiveTripTracking();
      await tripService.cancelTrip(activeTrip.id);
      setTripHistory((prev) => {
        const next = prev.map((item) =>
          item.id === activeTrip.id || item.status === 'ACTIVE'
            ? { ...item, status: 'CANCELLED' as const }
            : item
        );
        const userKey = getTripHistoryStorageKey(userRef.current.email);
        storage.saveItem(userKey, next);
        return next;
      });
    }
    setActiveTrip(null);
    setLocationTrackingError(null);
    setHomeZone((prev) => ({ ...prev, isInside: true }));
  };

  const retryLocationTracking = async () => {
    setLocationTrackingError(null);
    if (activeTrip) {
      await locationService.startActiveTripTracking(handleLocationUpdate, handleLocationError);
    }
  };

  const clearLocationError = () => {
    setLocationTrackingError(null);
  };

  const triggerGeofenceExitAlert = () => {
    geofenceService.triggerSimulatedExit().catch(console.warn);
    setHomeZone((prev) => ({ ...prev, isInside: false }));
    setIsGeofenceAlertVisible(true);
  };

  const dismissGeofenceAlert = () => {
    setIsGeofenceAlertVisible(false);
  };

  const confirmTripFromAlert = () => {
    setIsGeofenceAlertVisible(false);
  };

  /**
   * Manually push an updated location point to active trip
   */
  const updateActiveTripLocation = useCallback(
    (location: LocationPoint) => {
      handleLocationUpdate(location);
    },
    [handleLocationUpdate]
  );

  /**
   * Advance trip simulation step forward along the route (e.g. +15% progress)
   */
  const advanceTripSimulation = useCallback(
    (percentStep = 15) => {
      if (!activeTrip) return;
      const currentProgress = activeTrip.journeyProgressPercent || 5;
      const nextProgress = Math.min(currentProgress + percentStep, 100);

      const destCoords = {
        latitude: activeTrip.destination.latitude || 16.5062,
        longitude: activeTrip.destination.longitude || 80.648,
      };
      const startCoords = {
        latitude: activeTrip.startLocation.latitude,
        longitude: activeTrip.startLocation.longitude,
      };

      const simCoords = locationService.calculateSimulatedPoint(startCoords, destCoords, nextProgress);
      const latDir = simCoords.latitude >= 0 ? 'N' : 'S';
      const lonDir = simCoords.longitude >= 0 ? 'E' : 'W';
      const simulatedPoint: LocationPoint = {
        name: nextProgress >= 100 ? activeTrip.destination.name : `En Route (${nextProgress}%)`,
        address:
          nextProgress >= 100
            ? activeTrip.destination.address || 'Destination'
            : `${Math.abs(simCoords.latitude).toFixed(4)}° ${latDir}, ${Math.abs(simCoords.longitude).toFixed(4)}° ${lonDir}`,
        latitude: simCoords.latitude,
        longitude: simCoords.longitude,
        accuracy: 8,
        timestamp: new Date().toISOString(),
      };

      handleLocationUpdate(simulatedPoint);
    },
    [activeTrip, handleLocationUpdate]
  );

  const updateSettings = (newSettings: any) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password);
    if (result.success && result.user) {
      setUser(result.user);
      setToken(result.token || null);

      // Load user-isolated trip records
      const userTripKey = getTripHistoryStorageKey(result.user.email);
      const savedHistory = await storage.getItem<TripHistoryItem[]>(userTripKey);
      setTripHistory(savedHistory || []);

      // Load user-isolated contacts
      const userContactKey = getContactsStorageKey(result.user.email);
      const contactData = await contactService.getContacts();
      if (contactData.contacts && contactData.contacts.length > 0) {
        setContacts(contactData.contacts);
        await storage.saveItem(userContactKey, contactData.contacts);
      } else {
        const cachedContacts = await storage.getItem<FamilyContact[]>(userContactKey);
        setContacts(cachedContacts || []);
      }

      // Load user-isolated home zone
      const userHomeKey = getHomeZoneStorageKey(result.user.email);
      let userHome = await storage.getItem<HomeZone>(userHomeKey);
      if (!userHome && result.user.homeZone) {
        userHome = {
          name: result.user.homeZone.name || 'Home',
          address: result.user.homeZone.address || 'Home Sanctuary',
          latitude: result.user.homeZone.latitude || 16.4614,
          longitude: result.user.homeZone.longitude || 80.5069,
          radiusMeters: result.user.homeZone.radius || 200,
          isInside: true,
          lastInsideTime: 'Just now',
        };
        await storage.saveItem(userHomeKey, userHome);
      }
      if (userHome) {
        setHomeZone(userHome);
      }

      // Load user-isolated destinations
      const userDestKey = getDestinationsStorageKey(result.user.email);
      const destData = await destinationService.getDestinations();
      if (destData.destinations && destData.destinations.length > 0) {
        setDestinations(destData.destinations);
        await storage.saveItem(userDestKey, destData.destinations);
      } else {
        const cachedDest = await storage.getItem<Destination[]>(userDestKey);
        if (cachedDest) setDestinations(cachedDest);
      }

      // Check active trip specifically for this logged-in user
      const userActiveTrip = await tripService.getActiveTrip(result.user.email);
      if (!userActiveTrip || userActiveTrip.status !== 'ACTIVE') {
        setActiveTrip(null);
      }

      setIsCloudSynced(contactData.isLive);
    }
    return result;
  };

  const register = async (name: string, email: string, password: string, phone: string) => {
    const result = await authService.register(name, email, password, phone);
    if (result.success && result.user) {
      setUser(result.user);
      setToken(result.token || null);

      // New accounts start with completely fresh empty trip history & contacts
      const userTripKey = getTripHistoryStorageKey(result.user.email);
      await storage.saveItem(userTripKey, []);
      setTripHistory([]);

      const userContactKey = getContactsStorageKey(result.user.email);
      await storage.saveItem(userContactKey, []);
      setContacts([]);

      // Initialize fresh user-isolated destinations
      const userDestKey = getDestinationsStorageKey(result.user.email);
      const destData = await destinationService.getDestinations();
      setDestinations(destData.destinations);
      await storage.saveItem(userDestKey, destData.destinations);

      // Scoped fresh home zone for new user
      const userHomeKey = getHomeZoneStorageKey(result.user.email);
      const initialZone: HomeZone = {
        name: 'Home',
        address: 'Home Sanctuary, Safe Route Zone',
        latitude: 16.4614,
        longitude: 80.5069,
        radiusMeters: 200,
        isInside: true,
        lastInsideTime: 'Just now',
      };
      await storage.saveItem(userHomeKey, initialZone);
      setHomeZone(initialZone);
      setActiveTrip(null);

      setIsCloudSynced(true);
    }
    return result;
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setUser({ name: '', email: '', phone: '' });
    // Reset in-memory trip records, contacts, active trip, destinations, and home zone so no data leaks
    setTripHistory([]);
    setContacts([]);
    setDestinations(INITIAL_DESTINATIONS);
    setActiveTrip(null);
    setHomeZone(INITIAL_HOME_ZONE);
  };

  const clearTripHistory = useCallback(async () => {
    const userKey = getTripHistoryStorageKey(userRef.current.email);
    await storage.saveItem(userKey, []);
    setTripHistory([]);
  }, []);

  const deleteTripRecord = useCallback(async (id: string) => {
    setTripHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      const userKey = getTripHistoryStorageKey(userRef.current.email);
      storage.saveItem(userKey, next);
      return next;
    });
  }, []);

  return (
    <SafeRouteContext.Provider
      value={{
        user,
        setUser,
        token,
        isAuthenticated: Boolean(token || user.email),
        isCloudSynced,
        login,
        register,
        logout,
        homeZone,
        updateHomeZone,
        destinations,
        addDestination,
        deleteDestination,
        contacts,
        addContact,
        deleteContact,
        refreshContacts,
        toggleContactDeparture,
        toggleContactArrival,
        activeTrip,
        startTrip,
        completeActiveTrip,
        cancelActiveTrip,
        tripHistory,
        clearTripHistory,
        deleteTripRecord,
        isGeofenceAlertVisible,
        isGeofenceMonitoring,
        toggleGeofenceMonitoring,
        triggerGeofenceExitAlert,
        dismissGeofenceAlert,
        confirmTripFromAlert,
        locationTrackingError,
        clearLocationError,
        retryLocationTracking,
        lastCompletedTripDetails,
        clearCompletedTripDetails,
        updateActiveTripLocation,
        advanceTripSimulation,
        settings,
        updateSettings,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </SafeRouteContext.Provider>
  );
};

export const useSafeRoute = () => {
  const context = useContext(SafeRouteContext);
  if (!context) {
    throw new Error('useSafeRoute must be used within a SafeRouteProvider');
  }
  return context;
};
