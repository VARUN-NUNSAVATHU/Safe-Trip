import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { dataStore } from '../services/dataStore.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as { userId: string; email: string };
      req.user = decoded;
      return next();
    } catch {
      // Invalid JWT token, inspect headers and fallback
    }
  }

  // Support explicit user identity via headers (useful for offline mode & sandbox data isolation)
  const headerUserId = req.headers['x-user-id'] as string;
  const headerUserEmail = req.headers['x-user-email'] as string;
  const bodyUserId = req.body && req.body.userId;
  const bodyUserEmail = req.body && req.body.email;

  const resolvedEmail = (headerUserEmail || bodyUserEmail || '').trim().toLowerCase();
  let resolvedUserId = headerUserId || bodyUserId;

  if (resolvedEmail) {
    const existing = dataStore.findUserByEmail(resolvedEmail);
    if (existing) {
      resolvedUserId = existing._id;
    } else if (!resolvedUserId) {
      resolvedUserId = 'user_' + Buffer.from(resolvedEmail).toString('hex').slice(0, 10);
    }

    req.user = {
      userId: resolvedUserId,
      email: resolvedEmail,
    };
    return next();
  }

  if (resolvedUserId) {
    const existing = dataStore.findUserById(resolvedUserId);
    req.user = {
      userId: resolvedUserId,
      email: existing?.email || 'user@example.com',
    };
    return next();
  }

  // Fallback demo user only when completely anonymous
  req.user = {
    userId: 'user_alex_1',
    email: 'alex.johnson@example.com',
  };
  next();
};
