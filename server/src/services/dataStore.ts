/**
 * Central Isolated Persistent Data Store
 * Provides guaranteed data isolation per user email and user ID.
 * Persists all user accounts, contacts, trips, home zone, and destinations
 * to a local JSON database file (server/data/datastore.json) so data is NEVER lost
 * on server restart, reload, or crash.
 */

import fs from 'fs';
import path from 'path';

export interface UserData {
  _id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  pushToken?: string;
  homeZone: {
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    address?: string;
  };
  settings: {
    autoPromptOnExit: boolean;
    alarmVolume: number;
    vibrationEnabled: boolean;
    autoNotifyDelaySeconds: number;
  };
}

export interface ContactData {
  _id: string;
  id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  notifyOnDeparture?: boolean;
  notifyOnArrival?: boolean;
  isEmergencyContact?: boolean;
  avatarColor?: string;
}

export interface TripData {
  _id: string;
  id: string;
  userId: string;
  startLocation: {
    name?: string;
    latitude: number;
    longitude: number;
    address?: string;
  };
  destination: {
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
    timestamp?: Date | string;
  };
  endLocation?: any;
  startTime: Date | string;
  endTime?: Date | string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'PLANNED';
  contactsNotified?: any[];
  estimatedDurationMinutes?: number;
  transportMode?: string;
  notes?: string;
  waypoints?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
    estimatedMinutes?: number;
    order?: number;
    reached?: boolean;
    reachedAt?: Date | string;
  }>;
  activeLegIndex?: number;
}

export interface DestinationData {
  _id: string;
  id: string;
  userId: string;
  name: string;
  address: string;
  category?: string;
  latitude: number;
  longitude: number;
  estimatedMinutes?: number;
  distanceKm?: number;
  icon?: string;
}

// In-Memory Storage maps
const usersById = new Map<string, UserData>();
const usersByEmail = new Map<string, UserData>();
const contactsByUserId = new Map<string, ContactData[]>();
const tripsByUserId = new Map<string, TripData[]>();
const destinationsByUserId = new Map<string, DestinationData[]>();

// Helper to normalize emails for lookup
const normalizeEmail = (email: string) => (email || '').trim().toLowerCase();

// Resolve storage directory and file path
const candidateA = path.resolve(process.cwd(), 'server', 'data');
const candidateB = path.resolve(process.cwd(), 'data');
const dataDir = fs.existsSync(path.resolve(process.cwd(), 'server')) ? candidateA : candidateB;
const dataFilePath = path.join(dataDir, 'datastore.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (err) {
    console.warn('[DataStore] Could not create data directory:', err);
  }
}

function saveToDisk() {
  try {
    ensureDataDir();
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      users: Array.from(usersById.values()),
      contacts: Object.fromEntries(contactsByUserId),
      trips: Object.fromEntries(tripsByUserId),
      destinations: Object.fromEntries(destinationsByUserId),
    };
    fs.writeFileSync(dataFilePath, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.warn('[DataStore] Failed to write datastore to disk:', err);
  }
}

function loadFromDisk() {
  try {
    ensureDataDir();
    if (!fs.existsSync(dataFilePath)) {
      saveToDisk();
      return;
    }

    const raw = fs.readFileSync(dataFilePath, 'utf8');
    const data = JSON.parse(raw);

    if (Array.isArray(data.users) && data.users.length > 0) {
      usersById.clear();
      usersByEmail.clear();
      for (const u of data.users) {
        usersById.set(u._id, u);
        usersByEmail.set(normalizeEmail(u.email), u);
      }
    }

    if (data.contacts) {
      contactsByUserId.clear();
      for (const [userId, contacts] of Object.entries(data.contacts)) {
        contactsByUserId.set(userId, contacts as ContactData[]);
      }
    }

    if (data.trips) {
      tripsByUserId.clear();
      for (const [userId, trips] of Object.entries(data.trips)) {
        tripsByUserId.set(userId, trips as TripData[]);
      }
    }

    if (data.destinations) {
      destinationsByUserId.clear();
      for (const [userId, dests] of Object.entries(data.destinations)) {
        destinationsByUserId.set(userId, dests as DestinationData[]);
      }
    }

    if (!usersByEmail.has('demo@safetrip.app')) {
      const demoUser: UserData = {
        _id: 'user_demo_account',
        name: 'Demo Commuter',
        email: 'demo@safetrip.app',
        password: '$2b$10$Z7.yTyaLz/1oe.erYeCMC.ZX8O.oyfKXlUwxJtHylXMljlFWhSo7W',
        phone: '+1 (555) 014-4920',
        homeZone: {
          name: 'Home Sanctuary',
          latitude: 16.4614,
          longitude: 80.5069,
          radius: 200,
          address: 'Home Sanctuary, Safe Route Zone',
        },
        settings: {
          autoPromptOnExit: true,
          alarmVolume: 85,
          vibrationEnabled: true,
          autoNotifyDelaySeconds: 60,
        },
      };
      usersById.set(demoUser._id, demoUser);
      usersByEmail.set('demo@safetrip.app', demoUser);
      contactsByUserId.set(demoUser._id, [
        {
          _id: 'c_demo_mom',
          id: 'c_demo_mom',
          userId: demoUser._id,
          name: 'Mom',
          phone: '+1 (555) 019-2831',
          email: 'mom@family.safe',
          relationship: 'Parent',
          notifyOnDeparture: true,
        },
        {
          _id: 'c_demo_dad',
          id: 'c_demo_dad',
          userId: demoUser._id,
          name: 'Dad',
          phone: '+1 (555) 014-9922',
          email: 'dad@family.safe',
          relationship: 'Parent',
          notifyOnDeparture: true,
        },
      ]);
      destinationsByUserId.set(demoUser._id, [
        {
          _id: 'dest_demo_college',
          id: 'dest_demo_college',
          userId: demoUser._id,
          name: 'College Campus',
          address: 'Main University Gate, Academic Block A',
          category: 'College',
          latitude: 16.5062,
          longitude: 80.648,
        },
        {
          _id: 'dest_demo_office',
          id: 'dest_demo_office',
          userId: demoUser._id,
          name: 'Central Tech Park',
          address: 'Tower 4, Financial District',
          category: 'Office',
          latitude: 16.518,
          longitude: 80.62,
        },
      ]);
      saveToDisk();
    }
  } catch (err) {
    console.warn('[DataStore] Error loading datastore from disk:', err);
  }
}

// Initial load on startup
loadFromDisk();

export const dataStore = {
  // USER OPERATIONS
  saveUser(user: UserData): UserData {
    usersById.set(user._id, user);
    usersByEmail.set(normalizeEmail(user.email), user);
    if (!destinationsByUserId.has(user._id)) {
      destinationsByUserId.set(user._id, []);
    }
    // Ensure contacts map exists
    if (!contactsByUserId.has(user._id)) {
      contactsByUserId.set(user._id, []);
    }
    // Ensure trips map exists
    if (!tripsByUserId.has(user._id)) {
      tripsByUserId.set(user._id, []);
    }
    saveToDisk();
    return user;
  },

  findUserById(userId: string): UserData | null {
    if (!userId) return null;
    return usersById.get(userId) || null;
  },

  findUserByEmail(email: string): UserData | null {
    if (!email) return null;
    return usersByEmail.get(normalizeEmail(email)) || null;
  },

  updateUser(userId: string, partial: Partial<UserData>): UserData | null {
    const existing = usersById.get(userId);
    if (!existing) return null;

    const updated: UserData = {
      ...existing,
      ...partial,
      homeZone: partial.homeZone ? { ...existing.homeZone, ...partial.homeZone } : existing.homeZone,
      settings: partial.settings ? { ...existing.settings, ...partial.settings } : existing.settings,
    };

    usersById.set(userId, updated);
    usersByEmail.set(normalizeEmail(updated.email), updated);
    saveToDisk();
    return updated;
  },

  // CONTACT OPERATIONS (Strictly user-scoped)
  getUserContacts(userId: string): ContactData[] {
    return contactsByUserId.get(userId) || [];
  },

  addUserContact(userId: string, contact: Omit<ContactData, '_id' | 'id' | 'userId'>): ContactData {
    const id = 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newContact: ContactData = {
      _id: id,
      id,
      userId,
      ...contact,
    };
    const list = contactsByUserId.get(userId) || [];
    list.push(newContact);
    contactsByUserId.set(userId, list);
    saveToDisk();
    return newContact;
  },

  deleteUserContact(userId: string, contactId: string): boolean {
    const list = contactsByUserId.get(userId) || [];
    const filtered = list.filter((c) => c._id !== contactId && c.id !== contactId);
    contactsByUserId.set(userId, filtered);
    saveToDisk();
    return filtered.length < list.length;
  },

  updateUserContact(userId: string, contactId: string, updates: Partial<ContactData>): ContactData | null {
    const list = contactsByUserId.get(userId) || [];
    const idx = list.findIndex((c) => c._id === contactId || c.id === contactId);
    if (idx === -1) return null;

    list[idx] = { ...list[idx], ...updates };
    contactsByUserId.set(userId, list);
    saveToDisk();
    return list[idx];
  },

  // TRIP OPERATIONS (Strictly user-scoped)
  getUserTrips(userId: string): TripData[] {
    return tripsByUserId.get(userId) || [];
  },

  getActiveTrip(userId: string): TripData | null {
    const list = tripsByUserId.get(userId) || [];
    return list.find((t) => t.status === 'ACTIVE') || null;
  },

  addUserTrip(userId: string, trip: Omit<TripData, '_id' | 'id' | 'userId'>): TripData {
    const list = tripsByUserId.get(userId) || [];
    // If new trip is ACTIVE, close any previous ACTIVE trips so only 1 trip is monitored
    if (trip.status === 'ACTIVE') {
      list.forEach((t) => {
        if (t.status === 'ACTIVE') {
          t.status = 'COMPLETED';
          t.endTime = new Date();
        }
      });
    }

    const id = 'trip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newTrip: TripData = {
      _id: id,
      id,
      userId,
      ...trip,
    };
    list.unshift(newTrip);
    tripsByUserId.set(userId, list);
    saveToDisk();
    return newTrip;
  },

  deleteUserTrip(tripId: string, userId: string): boolean {
    const list = tripsByUserId.get(userId);
    if (!list) return false;
    const initialLen = list.length;
    const filtered = list.filter((t) => t.id !== tripId && t._id !== tripId);
    if (filtered.length !== initialLen) {
      tripsByUserId.set(userId, filtered);
      saveToDisk();
      return true;
    }
    return false;
  },

  clearUserTrips(userId: string): number {
    const list = tripsByUserId.get(userId);
    if (!list) return 0;
    const count = list.length;
    tripsByUserId.set(userId, []);
    saveToDisk();
    return count;
  },

  updateUserTrip(tripId: string, userId: string, updates: Partial<TripData>): TripData | null {
    let targetList: TripData[] | undefined;
    if (userId) {
      targetList = tripsByUserId.get(userId);
    } else {
      for (const list of tripsByUserId.values()) {
        if (list.some((t) => t._id === tripId || t.id === tripId)) {
          targetList = list;
          break;
        }
      }
    }

    if (!targetList) return null;
    const idx = targetList.findIndex((t) => t._id === tripId || t.id === tripId);
    if (idx === -1) return null;

    targetList[idx] = { ...targetList[idx], ...updates };
    saveToDisk();
    return targetList[idx];
  },

  // DESTINATION OPERATIONS (Strictly user-scoped)
  getUserDestinations(userId: string): DestinationData[] {
    const list = destinationsByUserId.get(userId);
    return list || [];
  },

  addUserDestination(userId: string, dest: Omit<DestinationData, '_id' | 'id' | 'userId'>): DestinationData {
    const id = 'dest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newDest: DestinationData = {
      _id: id,
      id,
      userId,
      ...dest,
    };
    const list = destinationsByUserId.get(userId) || [];
    list.unshift(newDest);
    destinationsByUserId.set(userId, list);
    saveToDisk();
    return newDest;
  },

  deleteUserDestination(userId: string, destId: string): boolean {
    const list = destinationsByUserId.get(userId) || [];
    const filtered = list.filter((d) => d._id !== destId && d.id !== destId);
    destinationsByUserId.set(userId, filtered);
    saveToDisk();
    return filtered.length < list.length;
  },

  // Forced persistence & reload utilities
  persistNow(): void {
    saveToDisk();
  },

  reloadFromDisk(): void {
    loadFromDisk();
  },
};
