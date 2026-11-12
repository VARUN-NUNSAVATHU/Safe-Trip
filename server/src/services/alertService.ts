import { ENV } from '../config/env.js';

export interface AlertPayload {
  userName: string;
  contactName: string;
  contactPhone: string;
  pushToken?: string;
  type: 'DEPARTURE' | 'ARRIVAL' | 'EMERGENCY';
  destination?: string;
  timestamp: Date;
}

export interface AlertDispatchResult {
  smsSent: boolean;
  pushSent: boolean;
  webhookSent: boolean;
  simulated: boolean;
  message: string;
}

/**
 * Format human-readable alert message
 */
export const formatAlertMessage = (payload: AlertPayload): { title: string; message: string } => {
  const timeStr = payload.timestamp instanceof Date ? payload.timestamp.toLocaleTimeString() : new Date().toLocaleTimeString();
  const dest = payload.destination || 'their destination';

  switch (payload.type) {
    case 'DEPARTURE':
      return {
        title: `SafeTrip: Departure Alert`,
        message: `SafeTrip Alert: ${payload.userName} has departed towards ${dest} at ${timeStr}. Expected ETA shared.`,
      };
    case 'ARRIVAL':
      return {
        title: `SafeTrip: Safe Arrival`,
        message: `SafeTrip Safe Arrival: ${payload.userName} has safely reached ${dest}!`,
      };
    case 'EMERGENCY':
      return {
        title: `🚨 SafeTrip: EMERGENCY ALERT`,
        message: `URGENT: ${payload.userName} triggered an Emergency Safety Alert from SafeTrip near their route to ${dest}.`,
      };
    default:
      return {
        title: `SafeTrip Notification`,
        message: `SafeTrip status update from ${payload.userName}.`,
      };
  }
};

/**
 * Dispatch real SMS via Twilio Messages REST API
 */
const sendTwilioSMS = async (to: string, message: string): Promise<boolean> => {
  if (!ENV.TWILIO_ACCOUNT_SID || !ENV.TWILIO_AUTH_TOKEN || !ENV.TWILIO_PHONE_NUMBER) {
    return false;
  }

  // Sanitize phone number (strip spaces/hyphens)
  const cleanTo = to.replace(/[\s\-()]/g, '');
  if (!cleanTo || cleanTo.length < 7) {
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${ENV.TWILIO_ACCOUNT_SID}/Messages.json`;
    const authHeader = 'Basic ' + Buffer.from(`${ENV.TWILIO_ACCOUNT_SID}:${ENV.TWILIO_AUTH_TOKEN}`).toString('base64');

    const bodyParams = new URLSearchParams();
    bodyParams.append('To', cleanTo);
    bodyParams.append('From', ENV.TWILIO_PHONE_NUMBER);
    bodyParams.append('Body', message);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[AlertService] Twilio SMS failed (${response.status}):`, errText);
      return false;
    }

    console.log(`[AlertService] Twilio SMS successfully delivered to ${cleanTo}`);
    return true;
  } catch (err) {
    console.warn('[AlertService] Twilio SMS network error:', (err as Error).message);
    return false;
  }
};

/**
 * Dispatch Push Notification via Expo Push REST API
 */
const sendExpoPush = async (pushToken: string, title: string, body: string, data: any): Promise<boolean> => {
  if (!pushToken || (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken['))) {
    return false;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (ENV.EXPO_ACCESS_TOKEN) {
      headers['Authorization'] = `Bearer ${ENV.EXPO_ACCESS_TOKEN}`;
    }

    const payload = {
      to: pushToken,
      sound: 'default',
      priority: 'high',
      title,
      body,
      data,
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`[AlertService] Expo push failed with status ${response.status}`);
      return false;
    }

    console.log(`[AlertService] Expo push notification delivered to token: ${pushToken.slice(0, 22)}...`);
    return true;
  } catch (err) {
    console.warn('[AlertService] Expo push error:', (err as Error).message);
    return false;
  }
};

/**
 * Dispatch webhook notification (e.g. Discord, Slack, custom webhook)
 */
const sendWebhookAlert = async (payload: AlertPayload, message: string): Promise<boolean> => {
  if (!ENV.ALERT_WEBHOOK_URL) {
    return false;
  }

  try {
    const response = await fetch(ENV.ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message, // Discord webhook format
        text: message,    // Slack webhook format
        alert: {
          type: payload.type,
          userName: payload.userName,
          contactName: payload.contactName,
          contactPhone: payload.contactPhone,
          destination: payload.destination,
          timestamp: payload.timestamp,
        },
      }),
    });

    return response.ok;
  } catch (err) {
    console.warn('[AlertService] Webhook alert error:', (err as Error).message);
    return false;
  }
};

/**
 * Primary multi-channel alert dispatcher
 */
export const sendFamilyAlert = async (payload: AlertPayload): Promise<AlertDispatchResult> => {
  const { title, message } = formatAlertMessage(payload);

  // 1. Attempt Twilio SMS if configured
  const smsSent = await sendTwilioSMS(payload.contactPhone, message);

  // 2. Attempt Expo Push Notification if pushToken provided or contactPhone is token
  const targetToken = payload.pushToken || (payload.contactPhone.startsWith('Expo') ? payload.contactPhone : undefined);
  const pushSent = targetToken ? await sendExpoPush(targetToken, title, message, { type: payload.type }) : false;

  // 3. Attempt Webhook if configured
  const webhookSent = await sendWebhookAlert(payload, message);

  const simulated = !smsSent && !pushSent && !webhookSent;

  // Always log cleanly for transparency and development debugging
  console.log(`\n=============================================================`);
  console.log(`[SafeTrip Multi-Channel Family Alert]`);
  console.log(`Type:        ${payload.type}`);
  console.log(`Recipient:   ${payload.contactName} (${payload.contactPhone})`);
  console.log(`Channels:    SMS: ${smsSent ? 'SENT' : 'SKIPPED/SIM'} | Push: ${pushSent ? 'SENT' : 'SKIPPED'} | Webhook: ${webhookSent ? 'SENT' : 'SKIPPED'}`);
  console.log(`Message:     "${message}"`);
  console.log(`=============================================================\n`);

  return {
    smsSent,
    pushSent,
    webhookSent,
    simulated,
    message,
  };
};

