import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeZoneScreen } from '../screens/HomeZoneScreen';
import { DestinationsScreen } from '../screens/DestinationsScreen';
import { StartTripScreen } from '../screens/StartTripScreen';
import { ActiveTripScreen } from '../screens/ActiveTripScreen';
import { TripCompletedScreen } from '../screens/TripCompletedScreen';
import { TabNavigator } from './TabNavigator';
import { AuthModal } from '../components/AuthModal';
import { useSafeRoute } from '../hooks/useSafeRouteState';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthModalOpen, authModalTab, closeAuthModal } = useSafeRoute();

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onStateChange={async () => {
          try {
            const currentRoute = navigationRef.getCurrentRoute();
            if (
              currentRoute?.name &&
              !['Splash', 'Login', 'Register', 'Onboarding'].includes(currentRoute.name)
            ) {
              const user = await authService.getStoredUser();
              if (user && user.email) {
                await AsyncStorage.setItem('@saferoute_last_screen', currentRoute.name);
                await AsyncStorage.setItem('@saferoute_has_visited', 'true');
                await AsyncStorage.removeItem('@saferoute_logged_out');
              }
            }
          } catch { }
        }}
      >
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            animation: 'fade_from_bottom',
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="SetHomeLocation" component={HomeZoneScreen} />
          <Stack.Screen name="Destinations" component={DestinationsScreen} />
          <Stack.Screen name="StartTrip" component={StartTripScreen} />
          <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
          <Stack.Screen name="TripCompleted" component={TripCompletedScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <AuthModal
        visible={isAuthModalOpen}
        onClose={closeAuthModal}
        initialTab={authModalTab}
      />
    </>
  );
};

export const RootNavigator: React.FC = () => {
  return <AppNavigator />;
};
