import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './notificationService';
import { HomeZone } from '../types';

export const GEOFENCE_TASK_NAME = 'SAFEROUTE_HOME_GEOFENCE_TASK';
const STORAGE_KEY_LAST_NOTIFIED = '@saferoute_last_geofence_notification_time';
const STORAGE_KEY_GEOFENCE_ENABLED = '@saferoute_geofence_enabled';
const NOTIFICATION_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes cooldown to prevent duplicate alerts

type GeofenceExitListener = () => void;
const exitListeners: Set<GeofenceExitListener> = new Set();

/**
 * Register foreground in-app listener
 */
export const addGeofenceExitListener = (listener: GeofenceExitListener) => {
  exitListeners.add(listener);
  return () => {
    exitListeners.delete(listener);
  };
};

const STORAGE_KEY_EXIT_LATCH = '@saferoute_exit_notification_latched';

/**
 * Define the Background Geofencing Task using expo-task-manager (native only).
 * This runs even when the app is in the background or minimized.
 */
if (Platform.OS !== 'web' && TaskManager?.defineTask) {
  try {
    TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
      if (error) {
        console.warn(`[GeofenceTask] Error in background task: ${error.message}`);
        return;
      }

      if (data) {
        const { eventType, region } = data as {
          eventType: Location.GeofencingEventType;
          region: Location.LocationRegion;
        };

        const isExit = eventType === Location.GeofencingEventType.Exit;
        console.log(
          `[GeofenceTask] Geofence event received: ${isExit ? 'EXIT' : 'ENTER'} for region: ${region.identifier}`
        );

        // Handle Geofence ENTER event: re-arms the geofence alarm for next departure
        if (!isExit) {
          console.log('[GeofenceTask] Re-entered Home Zone. Resetting exit alert latch.');
          await resetExitLatch();
          return;
        }

        // Handle Geofence EXIT event: trigger exactly one travel reminder
        if (isExit) {
          const shouldNotify = await shouldTriggerNotification();

          if (shouldNotify) {
            console.log('[GeofenceTask] Triggering Travel Reminder notification...');
            await notificationService.showGeofenceExitNotification();
            await recordNotificationSent();
            await setExitLatch();

            // Notify any active in-app foreground listeners
            exitListeners.forEach((listener) => {
              try {
                listener();
              } catch (e) {
                console.warn('[GeofenceTask] Error invoking listener:', e);
              }
            });
          } else {
            console.log('[GeofenceTask] Duplicate exit notification suppressed by latch/cooldown.');
          }
        }
      }
    });
  } catch (err) {
    console.warn('[GeofenceTask] TaskManager registration note:', err);
  }
}

/**
 * Checks if notification should fire (prevents duplicates per departure cycle)
 */
const shouldTriggerNotification = async (): Promise<boolean> => {
  try {
    const isLatched = (await AsyncStorage.getItem(STORAGE_KEY_EXIT_LATCH)) === 'true';
    if (isLatched) return false;

    const lastTimeStr = await AsyncStorage.getItem(STORAGE_KEY_LAST_NOTIFIED);
    if (!lastTimeStr) return true;

    const lastTime = parseInt(lastTimeStr, 10);
    const now = Date.now();
    return now - lastTime > NOTIFICATION_COOLDOWN_MS;
  } catch {
    return true;
  }
};

const setExitLatch = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_EXIT_LATCH, 'true');
  } catch {}
};

const resetExitLatch = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_EXIT_LATCH, 'false');
  } catch {}
};

/**
 * Records the timestamp of a sent notification
 */
const recordNotificationSent = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_LAST_NOTIFIED, Date.now().toString());
  } catch (err) {
    console.warn('Failed to record notification timestamp:', err);
  }
};

export const geofenceService = {
  /**
   * Request all necessary permissions for background geofencing
   */
  async requestAllPermissions(): Promise<{
    foregroundGranted: boolean;
    backgroundGranted: boolean;
    notificationsGranted: boolean;
  }> {
    if (Platform.OS === 'web') {
      return {
        foregroundGranted: true,
        backgroundGranted: true,
        notificationsGranted: true,
      };
    }

    // 1. Foreground Location
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    const foregroundGranted = fgStatus === Location.PermissionStatus.GRANTED;

    if (!foregroundGranted) {
      return { foregroundGranted: false, backgroundGranted: false, notificationsGranted: false };
    }

    // 2. Background Location
    let backgroundGranted = false;
    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      backgroundGranted = bgStatus === Location.PermissionStatus.GRANTED;
    } catch (e) {
      console.warn('Background location request failed or not supported in this runtime:', e);
    }

    // 3. Notifications
    const notificationsGranted = await notificationService.requestPermissions();
    await notificationService.setupNotificationCategories();

    return {
      foregroundGranted,
      backgroundGranted,
      notificationsGranted,
    };
  },

  /**
   * Start Geofencing for the user's Home Zone
   */
  async startHomeGeofencing(homeZone: HomeZone): Promise<boolean> {
    try {
      if (!homeZone.latitude || !homeZone.longitude) {
        console.warn('[GeofenceService] Missing latitude/longitude for Home Zone');
        return false;
      }

      // Web runtime uses simulated departure / distance checking
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(STORAGE_KEY_GEOFENCE_ENABLED, 'true');
        console.log(
          `[GeofenceService] Web runtime: Geofence active around ${homeZone.name} (${homeZone.radiusMeters}m radius)`
        );
        return true;
      }

      // Native low-power OS geofencing (iOS/Android)
      const region: Location.LocationRegion = {
        identifier: 'saferoute_home_region',
        latitude: homeZone.latitude,
        longitude: homeZone.longitude,
        radius: homeZone.radiusMeters || 200,
        notifyOnEnter: true,
        notifyOnExit: true,
      };

      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [region]);
      await AsyncStorage.setItem(STORAGE_KEY_GEOFENCE_ENABLED, 'true');

      console.log(
        `[GeofenceService] Started Home Geofencing around ${homeZone.name} (${homeZone.radiusMeters}m radius)`
      );
      return true;
    } catch (error) {
      console.warn('[GeofenceService] Failed to start geofencing:', error);
      return false;
    }
  },

  /**
   * Stop Geofencing
   */
  async stopHomeGeofencing(): Promise<boolean> {
    try {
      if (Platform.OS !== 'web') {
        const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME).catch(() => false);
        if (hasStarted) {
          await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME).catch(() => {});
        }
      }
      await AsyncStorage.setItem(STORAGE_KEY_GEOFENCE_ENABLED, 'false');
      console.log('[GeofenceService] Stopped Home Geofencing');
      return true;
    } catch (error) {
      console.warn('[GeofenceService] Failed to stop geofencing:', error);
      return false;
    }
  },

  /**
   * Check if Home Geofencing is currently registered and active
   */
  async isGeofencingActive(): Promise<boolean> {
    try {
      const isStoredEnabled = (await AsyncStorage.getItem(STORAGE_KEY_GEOFENCE_ENABLED)) === 'true';
      if (Platform.OS === 'web') {
        return isStoredEnabled;
      }
      const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME).catch(() => false);
      return hasStarted || isStoredEnabled;
    } catch {
      return false;
    }
  },

  /**
   * Manually test triggering the geofence exit flow (for testing & simulation)
   */
  async triggerSimulatedExit(): Promise<void> {
    await notificationService.showGeofenceExitNotification();
    await recordNotificationSent();
    exitListeners.forEach((listener) => listener());
  },
};
