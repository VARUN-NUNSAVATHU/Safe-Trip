import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { SafeRouteProvider } from './src/hooks/useSafeRouteState';
import { RootNavigator, navigationRef } from './src/navigation/RootNavigator';
import { ACTION_START_TRIP } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    // Web Global Scroll & Styling setup
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const styleId = 'safetrip-web-global-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow-x: hidden;
            background-color: #F8FAFC;
          }
          #root {
            display: flex;
            height: 100%;
            width: 100%;
          }
          /* Custom Smooth Scrollbar */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #F1F5F9;
          }
          ::-webkit-scrollbar-thumb {
            background: #CBD5E1;
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #94A3B8;
          }
        `;
        document.head.appendChild(style);
      }

      // Handle iframe wheel scroll events to scroll the active page view
      const handleGlobalWheelScroll = (e: MessageEvent) => {
        try {
          const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (data && data.type === 'SAFE_PAGE_SCROLL' && typeof data.deltaY === 'number') {
            const scrollContainers = Array.from(document.querySelectorAll('div')).filter((el) => {
              const s = window.getComputedStyle(el);
              return (
                (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
                el.scrollHeight > el.clientHeight
              );
            });
            const target =
              scrollContainers[0] ||
              document.querySelector('[data-scroll-container="true"]') ||
              document.scrollingElement ||
              document.documentElement ||
              document.body;
            if (target && typeof (target as any).scrollBy === 'function') {
              (target as any).scrollBy({ top: data.deltaY, behavior: 'auto' });
            } else {
              window.scrollBy({ top: data.deltaY, behavior: 'auto' });
            }
          }
        } catch {}
      };

      window.addEventListener('message', handleGlobalWheelScroll);
      return () => {
        window.removeEventListener('message', handleGlobalWheelScroll);
      };
    }
  }, []);

  useEffect(() => {
    // Listen for notification interactions (e.g. tapping "START TRIP" from notification)
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionIdentifier = response.actionIdentifier;

      if (
        actionIdentifier === ACTION_START_TRIP ||
        actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        console.log('[App] "START TRIP" action received from notification. Navigating to StartTrip...');
        if (navigationRef.isReady()) {
          navigationRef.navigate('StartTrip', {});
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeRouteProvider>
        <StatusBar style="dark" />
        <View style={styles.appContainer}>
          <RootNavigator />
        </View>
      </SafeRouteProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    width: '100%',
    height: '100%',
  },
});
