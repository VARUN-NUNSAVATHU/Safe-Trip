import { API_BASE_URL } from './apiConfig';
import { authService } from './authService';

export const api = {
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await res.json();
    } catch {
      return { status: 'offline', message: 'Operating in local client mode' };
    }
  },

  async startTrip(payload: any) {
    try {
      const token = await authService.getStoredToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/trips/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch {
      return { success: true, mock: true, data: payload };
    }
  },

  async completeTrip(tripId: string) {
    try {
      const token = await authService.getStoredToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/trips/${tripId}/complete`, {
        method: 'POST',
        headers,
      });
      return await res.json();
    } catch {
      return { success: true, mock: true };
    }
  },
};
