import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/saferoute',
  JWT_SECRET: process.env.JWT_SECRET || 'saferoute_super_secret_jwt_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Twilio SMS Integration
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  // Expo Push Notifications
  EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN || '',
  // Webhook integration (Discord, Slack, or Custom endpoint)
  ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL || '',
};
