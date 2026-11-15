import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { dataStore } from '../services/dataStore.js';

const router = Router();

/**
 * Third-Party OAuth Login Route (Google / GitHub SSO)
 * Kalvium Auth Concept: OAuth / 3rd-party login
 */
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  const { idToken, email, name, avatarUrl } = req.body || {};

  if (!email) {
    res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Bad Request',
      message: 'Email is required from OAuth provider token payload.',
    });
    return;
  }

  // Find or create OAuth user in datastore
  let user = dataStore.findUserByEmail(email);

  if (!user) {
    const newId = 'usr_oauth_' + Buffer.from(email).toString('hex').slice(0, 8);
    user = dataStore.saveUser({
      _id: newId,
      name: name || email.split('@')[0],
      email: email.toLowerCase().trim(),
      homeZone: {
        name: 'Home Sanctuary',
        latitude: 16.4614,
        longitude: 80.5069,
        radius: 200,
      },
      settings: {
        autoPromptOnExit: true,
        alarmVolume: 80,
        vibrationEnabled: true,
        autoNotifyDelaySeconds: 30,
      },
    });
  }

  const token = jwt.sign(
    {
      userId: user._id,
      id: user._id,
      email: user.email,
      name: user.name,
      role: 'user',
      authProvider: 'google',
    },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN } as any
  );

  res.status(200).json({
    success: true,
    statusCode: 200,
    authProvider: 'google',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: 'user',
    },
  });
});

export default router;
