import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API_BASE_URL } from './apiConfig';

export const TRAVEL_REMINDER_CATEGORY = 'TRAVEL_REMINDER_CATEGORY';
export const ACTION_START_TRIP = 'START_TRIP';
export const ACTION_DISMISS = 'DISMISS';

// Set default foreground notification handler (native only)
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      }),
    });
  } catch {}
}

export const notificationService = {
  /**
   * Request notification permissions from system
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return true;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.warn('[NotificationService] Failed to request permissions:', error);
      return false;
    }
  },

  /**
   * Configure alarm-like notification channel and action categories
   */
  async setupNotificationCategories(): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    if (Platform.OS === 'android') {
      // 1. Travel Reminder Alarms channel (High priority / Max importance)
      await Notifications.setNotificationChannelAsync('travel_reminder_alarm', {
        name: 'Travel Reminder Alarms',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#F97316',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      }).catch(() => {});

      // 2. Safe Arrival channel
      await Notifications.setNotificationChannelAsync('trip_arrival_channel', {
        name: 'Safe Arrival Confirmations',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#42B83F',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }).catch(() => {});
    }

    // Register interactive notification action buttons: "START TRIP" & "DISMISS"
    try {
      await Notifications.setNotificationCategoryAsync(TRAVEL_REMINDER_CATEGORY, [
        {
          identifier: ACTION_START_TRIP,
          buttonTitle: 'START TRIP',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: ACTION_DISMISS,
          buttonTitle: 'DISMISS',
          options: {
            isDestructive: true,
            opensAppToForeground: false,
          },
        },
      ]);
    } catch {}
  },

  /**
   * Send the alarm-like travel reminder notification upon geofence exit
   */
  async showGeofenceExitNotification(): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Travel Reminder 🔔',
        body: 'You have left Home. Did you start your journey?',
        data: { type: 'GEOFENCE_EXIT', timestamp: Date.now() },
        categoryIdentifier: TRAVEL_REMINDER_CATEGORY,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500],
        ...(Platform.OS === 'android' ? { channelId: 'travel_reminder_alarm' } : {}),
      },
      trigger: null, // deliver immediately
    });
  },

  /**
   * Send the safe arrival notification when entering destination perimeter
   */
  async showDestinationArrivalNotification(destinationName: string): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Arrived Safely! 🎯',
        body: `You have reached ${destinationName}. Trip marked as completed.`,
        data: { type: 'DESTINATION_ARRIVAL', timestamp: Date.now() },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' ? { channelId: 'trip_arrival_channel' } : {}),
      },
      trigger: null,
    });
  },

  /**
   * Dismiss all notifications or specific id
   */
  async dismissNotification(identifier?: string): Promise<void> {
    if (identifier) {
      await Notifications.dismissNotificationAsync(identifier);
    } else {
      await Notifications.dismissAllNotificationsAsync();
    }
  },

  /**
   * Get Expo Push Token for remote family safety push notifications and register with backend
   */
  async registerForPushNotificationsAsync(authToken?: string): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    try {
      const permissionGranted = await this.requestPermissions();
      if (!permissionGranted) return null;

      const pushTokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
      const pushToken = pushTokenData?.data || null;

      if (pushToken && authToken) {
        // Sync token with backend API
        await fetch(`${API_BASE_URL}/users/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ pushToken }),
        }).catch(() => null);
      }

      return pushToken;
    } catch (err) {
      console.warn('[NotificationService] Push token registration error:', err);
      return null;
    }
  },
};

