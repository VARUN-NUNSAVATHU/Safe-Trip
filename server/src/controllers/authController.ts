import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ENV } from '../config/env.js';
import { AuthRequest } from '../middleware/auth.js';
import { dataStore, UserData } from '../services/dataStore.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user: any = null;
    if (isDbConnected()) {
      try {
        user = await User.create({
          name,
          email,
          password: hashedPassword,
          phone: phone || '',
        });
      } catch (dbErr) {
        // DB error or duplicate
      }
    }

    if (!user) {
      // In-memory data store with unique ID per user
      const existing = dataStore.findUserByEmail(email);
      const uniqueId = existing?._id || 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      user = {
        _id: uniqueId,
        name,
        email,
        password: hashedPassword,
        phone: phone || '',
        homeZone: {
          name: 'Home',
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
      dataStore.saveUser(user as UserData);
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, ENV.JWT_SECRET, {
      expiresIn: '7d',
    });

    const userPayload = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: (user as any).phone,
      homeZone: (user as any).homeZone,
    };

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userPayload,
      data: {
        token,
        user: userPayload,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    let user: any = null;
    if (isDbConnected()) {
      try {
        user = await User.findOne({ email });
      } catch {
        // fallback
      }
    }

    if (!user) {
      user = dataStore.findUserByEmail(email);
    }

    // If user not found, reject with 401 with clear guidance
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'No account found for this email. Click "Create Account" below to register, or use "Explore Demo Mode" to enter instantly.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, ENV.JWT_SECRET, {
      expiresIn: '7d',
    });

    const userPayload = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      homeZone: user.homeZone,
    };

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: userPayload,
      data: {
        token,
        user: userPayload,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const email = req.user?.email;

    let user: any = null;
    if (isDbConnected() && userId) {
      try {
        user = await User.findById(userId).select('-password');
      } catch {}
    }

    if (!user && userId) {
      user = dataStore.findUserById(userId);
    }

    if (!user && email) {
      user = dataStore.findUserByEmail(email);
    }

    if (!user) {
      user = {
        _id: userId || 'mock_user_123',
        name: 'Safe Traveler',
        email: email || 'user@example.com',
        phone: '+1-555-0144',
        homeZone: {
          name: 'Home',
          latitude: 16.4614,
          longitude: 80.5069,
          radius: 200,
          address: 'Home Sanctuary',
        },
      };
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};
