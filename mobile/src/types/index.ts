export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  homeZone?: any;
}

export interface HomeZone {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  lastInsideTime?: string;
  isInside: boolean;
}

export interface Destination {
  id: string;
  name: string;
  address: string;
  category: 'College' | 'Work' | 'Gym' | 'Library' | 'Family' | 'Other';
  icon: string;
  estimatedMinutes: number;
  distanceKm: number;
  latitude?: number;
  longitude?: number;
  routePath?: [number, number][];
}

export interface FamilyContact {
  id: string;
  name: string;
  phone: string;
  relationship: 'Mother' | 'Father' | 'Guardian' | 'Sibling' | 'Partner' | 'Friend' | 'Other';
  notifyOnDeparture: boolean;
  notifyOnArrival: boolean;
  isEmergencyContact: boolean;
  avatarColor?: string;
}

export type TripStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface LocationPoint {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number | null;
  timestamp?: string;
}

export interface LocationTrackingError {
  type: 'PERMISSION_DENIED' | 'GPS_DISABLED' | 'NETWORK_UNAVAILABLE' | 'TRACKING_ERROR';
  message: string;
}

export interface Trip {
  id: string;
  userId: string;
  startLocation: LocationPoint;
  destination: LocationPoint;
  startTime: string;
  status: TripStatus;
  endTime?: string;
  endLocation?: LocationPoint;
  currentLocation?: LocationPoint;
  contactsNotified?: string[];
  estimatedMinutes?: number;
  transportMode?: string;
}

export interface ActiveTripState {
  id: string;
  userId?: string;
  startLocation: LocationPoint;
  destination: Destination;
  currentLocation: LocationPoint;
  transportMode: 'Transit' | 'Car' | 'Walking' | 'Bicycle';
  startTime: string;
  startedAt: Date;
  estimatedArrivalMinutes: number;
  elapsedMinutes: number;
  distanceRemainingKm: number;
  journeyProgressPercent: number;
  status: TripStatus;
  notifiedContacts: string[];
  lastLocationUpdate: string;
  routePath?: [number, number][];
}

export interface TripHistoryItem {
  id: string;
  destinationName: string;
  destinationAddress: string;
  date: string;
  durationMinutes: number;
  distanceKm: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  contactsNotifiedCount: number;
}

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: { prefilledEmail?: string } | undefined;
  MainTabs: undefined;
  SetHomeLocation: undefined;
  Destinations: undefined;
  StartTrip: { preselectedDestination?: Destination };
  ActiveTrip: undefined;
  TripCompleted: { tripDetails?: any };
};

export type TabParamList = {
  HomeTab: undefined;
  DestinationsTab: undefined;
  ContactsTab: undefined;
  SettingsTab: undefined;
};
