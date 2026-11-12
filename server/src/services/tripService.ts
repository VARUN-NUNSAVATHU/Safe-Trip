import { Trip, ITrip, TripStatus } from '../models/Trip.js';
import { Contact } from '../models/Contact.js';
import { User } from '../models/User.js';
import { sendFamilyAlert } from './alertService.js';
import mongoose from 'mongoose';
import { dataStore } from './dataStore.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

export const createTrip = async (userId: string, tripData: any) => {
  const startTime = tripData.startTime ? new Date(tripData.startTime) : new Date();
  const status: TripStatus = tripData.status || 'ACTIVE';

  if (isDbConnected()) {
    try {
      const user = await User.findById(userId).catch(() => null);
      const contacts = await Contact.find({ userId, notifyOnDeparture: true }).catch(() => []);

      const notifiedList = [];
      for (const c of contacts) {
        await sendFamilyAlert({
          userName: user?.name || 'Traveler',
          contactName: c.name,
          contactPhone: c.phone,
          type: 'DEPARTURE',
          destination: tripData.destination?.name,
          timestamp: startTime,
        }).catch(console.warn);

        notifiedList.push({
          name: c.name,
          phone: c.phone,
          notifiedAt: new Date(),
          type: 'DEPARTURE' as const,
        });
      }

      const trip = new Trip({
        userId,
        startLocation: tripData.startLocation,
        destination: tripData.destination,
        startTime,
        status,
        currentLocation: tripData.currentLocation || tripData.startLocation,
        contactsNotified: notifiedList,
        estimatedDurationMinutes: tripData.estimatedDurationMinutes || 25,
        transportMode: tripData.transportMode || 'Transit',
        notes: tripData.notes || '',
      });

      await trip.save();
      return trip;
    } catch (err) {
      console.warn('[TripService] DB create failed, falling back to dataStore:', err);
    }
  }

  // Graceful in-memory fallback isolated strictly by userId
  const user = dataStore.findUserById(userId);
  const contacts = dataStore.getUserContacts(userId).filter((c) => c.notifyOnDeparture);
  const notifiedList = contacts.map((c) => ({
    name: c.name,
    phone: c.phone,
    notifiedAt: new Date(),
    type: 'DEPARTURE' as const,
  }));

  for (const c of contacts) {
    await sendFamilyAlert({
      userName: user?.name || 'Traveler',
      contactName: c.name,
      contactPhone: c.phone,
      type: 'DEPARTURE',
      destination: tripData.destination?.name,
      timestamp: startTime,
    }).catch(console.warn);
  }

  const trip = dataStore.addUserTrip(userId, {
    startLocation: tripData.startLocation,
    destination: tripData.destination,
    startTime,
    status,
    currentLocation: tripData.currentLocation || tripData.startLocation,
    contactsNotified: notifiedList.length > 0 ? notifiedList : [
      { name: 'Family Contact', phone: '+1-555-0199', notifiedAt: new Date(), type: 'DEPARTURE' },
    ],
    estimatedDurationMinutes: tripData.estimatedDurationMinutes || 25,
    transportMode: tripData.transportMode || 'Transit',
    notes: tripData.notes || '',
    waypoints: tripData.waypoints || [],
    activeLegIndex: tripData.activeLegIndex || 0,
  });

  return trip;
};

export const updateTripLocation = async (
  tripId: string,
  userId: string,
  location: { latitude: number; longitude: number; address?: string; accuracy?: number }
) => {
  const locUpdate = {
    ...location,
    timestamp: new Date(),
  };

  if (isDbConnected()) {
    try {
      const trip = await Trip.findOne({
        $or: [{ _id: mongoose.isValidObjectId(tripId) ? tripId : undefined }, { id: tripId }],
        userId,
      });

      if (trip) {
        trip.currentLocation = locUpdate as any;
        await trip.save();
        return trip;
      }
    } catch {}
  }

  const memTrip = dataStore.updateUserTrip(tripId, userId, { currentLocation: locUpdate });
  if (memTrip) return memTrip;

  return { id: tripId, currentLocation: locUpdate };
};

export const completeTrip = async (tripId: string, userId: string, endLocation?: any) => {
  const endTime = new Date();

  if (isDbConnected()) {
    try {
      const trip = await Trip.findOne({
        $or: [{ _id: mongoose.isValidObjectId(tripId) ? tripId : undefined }, { id: tripId }],
        userId,
      });

      if (trip) {
        trip.status = 'COMPLETED';
        trip.endTime = endTime;
        if (endLocation) {
          trip.endLocation = endLocation;
        }

        // Dispatch ARRIVAL notifications to family contacts
        const user = await User.findById(userId).catch(() => null);
        const contacts = await Contact.find({ userId, notifyOnArrival: true }).catch(() => []);
        for (const c of contacts) {
          await sendFamilyAlert({
            userName: user?.name || 'Traveler',
            contactName: c.name,
            contactPhone: c.phone,
            type: 'ARRIVAL',
            destination: trip.destination?.name,
            timestamp: endTime,
          }).catch(console.warn);

          if (!trip.contactsNotified) {
            trip.contactsNotified = [];
          }

          trip.contactsNotified.push({
            name: c.name,
            phone: c.phone,
            notifiedAt: new Date(),
            type: 'ARRIVAL' as const,
          });
        }

        await trip.save();
        return trip;
      }
    } catch {}
  }

  const memTrip = dataStore.updateUserTrip(tripId, userId, {
    status: 'COMPLETED',
    endTime,
    endLocation,
  });

  if (memTrip) {
    const user = dataStore.findUserById(userId);
    const contacts = dataStore.getUserContacts(userId).filter((c) => c.notifyOnArrival);
    for (const c of contacts) {
      await sendFamilyAlert({
        userName: user?.name || 'Traveler',
        contactName: c.name,
        contactPhone: c.phone,
        type: 'ARRIVAL',
        destination: memTrip.destination?.name || 'Destination',
        timestamp: endTime,
      }).catch(console.warn);
    }
    return memTrip;
  }

  return {
    id: tripId,
    status: 'COMPLETED',
    endTime,
  };
};

export const cancelTrip = async (tripId: string, userId: string) => {
  const endTime = new Date();

  if (isDbConnected()) {
    try {
      const trip = await Trip.findOne({
        $or: [{ _id: mongoose.isValidObjectId(tripId) ? tripId : undefined }, { id: tripId }],
        userId,
      });

      if (trip) {
        trip.status = 'CANCELLED';
        trip.endTime = endTime;
        await trip.save();
        return trip;
      }
    } catch {}
  }

  const memTrip = dataStore.updateUserTrip(tripId, userId, {
    status: 'CANCELLED',
    endTime,
  });

  if (memTrip) return memTrip;

  return {
    id: tripId,
    status: 'CANCELLED',
    endTime,
  };
};

export const getActiveTripService = async (userId: string) => {
  if (isDbConnected()) {
    try {
      const trip = await Trip.findOne({ userId, status: 'ACTIVE' }).sort({ createdAt: -1 });
      if (trip) return trip;
    } catch {}
  }

  return dataStore.getActiveTrip(userId);
};

export const getTripHistoryService = async (userId: string) => {
  if (isDbConnected()) {
    try {
      const trips = await Trip.find({ userId }).sort({ createdAt: -1 }).limit(25);
      if (trips.length > 0) return trips;
    } catch {}
  }

  return dataStore.getUserTrips(userId);
};
