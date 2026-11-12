import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { dataStore } from '../services/dataStore.js';

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const email = req.user?.email;

    let user: any = null;
    try {
      if (userId) {
        user = await User.findById(userId).select('-password');
      }
    } catch {
      // offline
    }

    if (!user && userId) {
      user = dataStore.findUserById(userId);
    }
    if (!user && email) {
      user = dataStore.findUserByEmail(email);
    }

    if (!user) {
      user = {
        _id: userId || 'user_guest',
        name: email ? email.split('@')[0] : 'Traveler',
        email: email || 'user@example.com',
        phone: '+1-555-0144',
        homeZone: {
          name: 'Home',
          latitude: 16.4614,
          longitude: 80.5069,
          radius: 200,
          address: 'Home Sanctuary',
        },
        settings: {
          autoPromptOnExit: true,
          alarmVolume: 85,
          vibrationEnabled: true,
          autoNotifyDelaySeconds: 60,
        },
      } as any;
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const updateHomeZone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || 'user_guest';
    const { name, latitude, longitude, radius, address } = req.body;

    let updatedZone = {
      name: name || 'Home',
      latitude: Number(latitude) || 16.4614,
      longitude: Number(longitude) || 80.5069,
      radius: Number(radius) || 200,
      address: address || '',
    };

    try {
      await User.findByIdAndUpdate(userId, { homeZone: updatedZone });
    } catch {
      // offline
    }

    // Always update the user's isolated in-memory record
    if (userId) {
      dataStore.updateUser(userId, { homeZone: updatedZone });
    }

    res.status(200).json({
      success: true,
      message: 'Home Zone updated successfully',
      data: updatedZone,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const updatePushToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { pushToken } = req.body;

    if (!pushToken) {
      res.status(400).json({ success: false, message: 'pushToken is required' });
      return;
    }

    try {
      await User.findByIdAndUpdate(userId, { pushToken });
    } catch {
      // offline
    }

    if (userId) {
      dataStore.updateUser(userId, { pushToken });
    }

    res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
      data: { pushToken },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};
