import { Destination, FamilyContact, HomeZone, TripHistoryItem } from '../types';

export const INITIAL_HOME_ZONE: HomeZone = {
  name: 'Home Sanctuary',
  address: 'Home Sanctuary, Safe Route Zone',
  latitude: 16.4614,
  longitude: 80.5069,
  radiusMeters: 200,
  lastInsideTime: 'Just now',
  isInside: true,
};

export const INITIAL_DESTINATIONS: Destination[] = [];

export const INITIAL_CONTACTS: FamilyContact[] = [];

export const INITIAL_TRIP_HISTORY: TripHistoryItem[] = [];
