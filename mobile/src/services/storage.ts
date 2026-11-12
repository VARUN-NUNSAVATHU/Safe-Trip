import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER_TOKEN: '@saferoute_token',
  HOME_ZONE: '@saferoute_home_zone',
  CONTACTS: '@saferoute_contacts',
  SAVED_DESTINATIONS: '@saferoute_destinations',
};

export const storage = {
  async saveItem(key: string, value: any) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Failed to save to storage', e);
    }
  },

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async removeItem(key: string) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to remove item', e);
    }
  },
};
