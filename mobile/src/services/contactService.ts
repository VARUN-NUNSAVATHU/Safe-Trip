import AsyncStorage from '@react-native-async-storage/async-storage';
import { FamilyContact } from '../types';
import { authService } from './authService';
import { API_BASE_URL } from './apiConfig';

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 4000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

const AVATAR_COLORS = ['#42B83F', '#369E33', '#2563EB', '#10B981', '#7C3AED', '#D97706'];

export const getContactsStorageKey = (email?: string) =>
  email ? `@saferoute_contacts_${email.trim().toLowerCase()}` : '@saferoute_contacts_guest';

export const contactService = {
  /**
   * Fetch contacts from backend with offline cache fallback
   */
  async getContacts(): Promise<{ contacts: FamilyContact[]; isLive: boolean }> {
    const storedUser = await authService.getStoredUser();
    const token = await authService.getStoredToken();
    const userStorageKey = getContactsStorageKey(storedUser?.email);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(storedUser?.id ? { 'x-user-id': storedUser.id } : {}),
        ...(storedUser?.email ? { 'x-user-email': storedUser.email } : {}),
      };

      const response = await fetchWithTimeout(`${API_BASE_URL}/contacts`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          const mapped: FamilyContact[] = json.data.map((c: any, index: number) => ({
            id: c.id || c._id || 'c_' + index,
            name: c.name,
            phone: c.phone,
            relationship: c.relationship || 'Parent',
            notifyOnDeparture: c.notifyOnDeparture ?? true,
            notifyOnArrival: c.notifyOnArrival ?? true,
            isEmergencyContact: c.isEmergencyContact ?? (index < 2),
            avatarColor: c.avatarColor || AVATAR_COLORS[index % AVATAR_COLORS.length],
          }));

          // Cache user-scoped contacts to AsyncStorage
          await AsyncStorage.setItem(userStorageKey, JSON.stringify(mapped));
          return { contacts: mapped, isLive: true };
        }
      }
    } catch (err) {
      console.warn('[ContactService] Cloud fetch failed, checking local cache:', err);
    }

    // Fallback: Read from local persistent cache for this user
    try {
      const cached = await AsyncStorage.getItem(userStorageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return { contacts: parsed, isLive: false };
        }
      }
    } catch {}

    // Fresh user starts with empty contact list
    return { contacts: [], isLive: false };
  },

  /**
   * Add a new contact to backend REST API & local storage
   */
  async addContact(newContact: Omit<FamilyContact, 'id'>): Promise<FamilyContact> {
    const token = await authService.getStoredToken();
    const storedUser = await authService.getStoredUser();
    const userStorageKey = getContactsStorageKey(storedUser?.email);

    const tempId = 'c_' + Date.now();
    const contactToSave: FamilyContact = {
      ...newContact,
      id: tempId,
      avatarColor: newContact.avatarColor || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    };

    // 1. Persist locally first for zero-latency UI update
    try {
      const cached = await AsyncStorage.getItem(userStorageKey);
      const list: FamilyContact[] = cached ? JSON.parse(cached) : [];
      list.push(contactToSave);
      await AsyncStorage.setItem(userStorageKey, JSON.stringify(list));
    } catch (e) {
      console.warn('[ContactService] Local cache save error:', e);
    }

    // 2. Sync to Backend API
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(storedUser?.id ? { 'x-user-id': storedUser.id } : {}),
        ...(storedUser?.email ? { 'x-user-email': storedUser.email } : {}),
      };

      const response = await fetchWithTimeout(`${API_BASE_URL}/contacts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newContact.name,
          phone: newContact.phone,
          relationship: newContact.relationship,
          notifyOnDeparture: newContact.notifyOnDeparture,
          notifyOnArrival: newContact.notifyOnArrival,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.data && (json.data._id || json.data.id)) {
          contactToSave.id = json.data._id || json.data.id;
          // Re-update local storage with permanent ID
          const cached = await AsyncStorage.getItem(userStorageKey);
          if (cached) {
            const list: FamilyContact[] = JSON.parse(cached);
            const idx = list.findIndex((c) => c.id === tempId);
            if (idx >= 0) {
              list[idx].id = contactToSave.id;
              await AsyncStorage.setItem(userStorageKey, JSON.stringify(list));
            }
          }
        }
      }
    } catch {
      // Backend offline: successfully saved in offline-first mode
    }

    return contactToSave;
  },

  /**
   * Delete a contact by ID
   */
  async deleteContact(contactId: string): Promise<boolean> {
    const token = await authService.getStoredToken();
    const storedUser = await authService.getStoredUser();
    const userStorageKey = getContactsStorageKey(storedUser?.email);

    // 1. Remove from local storage
    try {
      const cached = await AsyncStorage.getItem(userStorageKey);
      if (cached) {
        const list: FamilyContact[] = JSON.parse(cached);
        const filtered = list.filter((c) => c.id !== contactId);
        await AsyncStorage.setItem(userStorageKey, JSON.stringify(filtered));
      }
    } catch {}

    // 2. Notify backend
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(storedUser?.id ? { 'x-user-id': storedUser.id } : {}),
        ...(storedUser?.email ? { 'x-user-email': storedUser.email } : {}),
      };

      await fetchWithTimeout(`${API_BASE_URL}/contacts/${contactId}`, {
        method: 'DELETE',
        headers,
      });
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Update notification toggles for a contact
   */
  async updateContactPreferences(
    contactId: string,
    updates: Partial<FamilyContact>
  ): Promise<void> {
    try {
      const storedUser = await authService.getStoredUser();
      const userStorageKey = getContactsStorageKey(storedUser?.email);
      const cached = await AsyncStorage.getItem(userStorageKey);
      if (cached) {
        const list: FamilyContact[] = JSON.parse(cached);
        const idx = list.findIndex((c) => c.id === contactId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...updates };
          await AsyncStorage.setItem(userStorageKey, JSON.stringify(list));
        }
      }
    } catch {}
  },
};
