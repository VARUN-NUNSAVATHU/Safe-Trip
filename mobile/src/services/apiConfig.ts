import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

/**
 * SafeTrip API Base URL Configuration
 * Dynamically resolves the active backend API URL across Desktop Web,
 * Mobile Web, and Physical Phones / Emulators over LAN.
 */
const normalizeApiUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const extractLanHost = (rawUri?: string | null): string | null => {
  if (!rawUri || typeof rawUri !== 'string') return null;
  const cleaned = rawUri
    .trim()
    .replace(/^[a-zA-Z0-9+.-]+:\/\//, '')
    .split('/')[0]
    .split('?')[0];
  const host = cleaned.split(':')[0];
  if (
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.exp.direct') ||
    host.endsWith('.expo.dev') ||
    host.endsWith('.expo.io')
  ) {
    return null;
  }
  return host;
};

export const getApiBaseUrl = (): string => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  if (configuredUrl && configuredUrl.trim().length > 0) {
    return normalizeApiUrl(configuredUrl);
  }

  if (Platform.OS === 'web' || (typeof window !== 'undefined' && window.location)) {
    const host = window.location?.hostname || 'localhost';
    if (window.location?.port === '5000' || (window.location?.protocol === 'https:' && !window.location?.port)) {
      return `${window.location.origin}/api`;
    }
    return `http://${host}:5000/api`;
  }

  // Native iOS / Android: derive PC LAN IP automatically from Expo Metro host
  const manifest2Debugger = (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost;
  const scriptUrl = (NativeModules as any)?.SourceCode?.scriptURL;
  const candidates = [
    Constants.expoConfig?.hostUri,
    manifest2Debugger,
    Constants.experienceUrl,
    scriptUrl,
  ];

  for (const candidate of candidates) {
    const lanHost = extractLanHost(candidate);
    if (lanHost) {
      return `http://${lanHost}:5000/api`;
    }
  }

  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiBaseUrl();
