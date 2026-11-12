import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import {
  createTrip,
  completeTrip,
  cancelTrip,
  updateTripLocation,
  getActiveTripService,
  getTripHistoryService,
} from '../services/tripService.js';

export const startTrip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.body.userId || 'user_guest';
    const { destination, startLocation, startTime, estimatedMinutes, transportMode, notes, waypoints } = req.body;

    const trip = await createTrip(userId, {
      destination: destination || { name: 'Destination', latitude: 16.5062, longitude: 80.648 },
      startLocation: startLocation || { name: 'Home Zone', latitude: 16.4614, longitude: 80.5069 },
      startTime: startTime || new Date(),
      status: 'ACTIVE',
      estimatedDurationMinutes: estimatedMinutes || 25,
      transportMode: transportMode || 'Transit',
      notes,
      waypoints: waypoints || [],
      activeLegIndex: 0,
    });

    res.status(201).json({
      success: true,
      message: 'Trip started & family contacts alerted',
      data: trip,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const advanceTripLeg = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.body.userId || 'user_guest';
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const { legIndex, location } = req.body;

    const currentTrip = (await import('../services/dataStore.js')).dataStore.getUserTrips(userId).find((t: any) => t.id === id || t._id === id);
    if (!currentTrip) {
      res.status(404).json({ success: false, message: 'Trip not found' });
      return;
    }

    const nextIndex = typeof legIndex === 'number' ? legIndex : ((currentTrip.activeLegIndex || 0) + 1);
    const updatedWaypoints = currentTrip.waypoints ? [...currentTrip.waypoints] : [];
    if (updatedWaypoints[nextIndex - 1]) {
      updatedWaypoints[nextIndex - 1].reached = true;
      updatedWaypoints[nextIndex - 1].reachedAt = new Date();
    }

    const { dataStore } = await import('../services/dataStore.js');
    const updated = dataStore.updateUserTrip(id, userId, {
      activeLegIndex: nextIndex,
      waypoints: updatedWaypoints,
      currentLocation: location || (updatedWaypoints[nextIndex - 1] ? {
        latitude: updatedWaypoints[nextIndex - 1].latitude,
        longitude: updatedWaypoints[nextIndex - 1].longitude,
        address: updatedWaypoints[nextIndex - 1].name,
      } : currentTrip.currentLocation),
    });

    res.status(200).json({
      success: true,
      message: `Leg advanced to stop ${nextIndex + 1}`,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const updateLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.body.userId || 'user_guest';
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const { location } = req.body;

    if (!location || location.latitude === undefined || location.longitude === undefined) {
      res.status(400).json({ success: false, message: 'Valid location coordinates are required' });
      return;
    }

    const updated = await updateTripLocation(id, userId, location);

    res.status(200).json({
      success: true,
      message: 'Trip live location updated',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const finishTrip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.body.userId || 'user_guest';
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const { endLocation } = req.body;
    const trip = await completeTrip(id, userId, endLocation);

    res.status(200).json({
      success: true,
      message: 'Trip completed safely! Family contacts notified.',
      data: trip,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const cancelTripHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.body.userId || 'user_guest';
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const trip = await cancelTrip(id, userId);

    res.status(200).json({
      success: true,
      message: 'Trip cancelled and tracking stopped.',
      data: trip,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getActiveTrip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.query.userId?.toString() || 'user_guest';
    const trip = await getActiveTripService(userId);

    res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getTripHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.query.userId?.toString() || 'user_guest';
    const trips = await getTripHistoryService(userId);

    res.status(200).json({
      success: true,
      data: trips,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const deleteTripHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.body.userId || 'user_guest';
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const { dataStore } = await import('../services/dataStore.js');
    const deleted = dataStore.deleteUserTrip(id, userId);

    res.status(200).json({
      success: true,
      message: deleted ? 'Trip record deleted' : 'Trip not found',
      deleted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const clearTripHistoryHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.body.userId || 'user_guest';
    const { dataStore } = await import('../services/dataStore.js');
    const count = dataStore.clearUserTrips(userId);

    res.status(200).json({
      success: true,
      message: `Cleared ${count} trip records`,
      count,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

