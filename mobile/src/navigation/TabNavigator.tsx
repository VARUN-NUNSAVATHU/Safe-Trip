import React from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TabParamList } from '../types';
import { COLORS } from '../utils/theme';
import { HomeScreen } from '../screens/HomeScreen';
import { DestinationsScreen } from '../screens/DestinationsScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 768;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.brandGreen,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: isDesktopWeb
          ? { display: 'none' }
          : {
              backgroundColor: COLORS.white,
              borderTopColor: COLORS.borderLight,
              borderTopWidth: 1,
              height: 72,
              paddingBottom: 10,
              paddingTop: 8,
            },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
              break;
            case 'DestinationsTab':
              iconName = focused ? 'location' : 'location-outline';
              break;
            case 'ContactsTab':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'SettingsTab':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          if (focused) {
            return (
              <View style={{
                backgroundColor: 'rgba(66,184,63,0.12)',
                borderRadius: 10,
                padding: 5,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name={iconName} size={22} color={color} />
              </View>
            );
          }
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="DestinationsTab"
        component={DestinationsScreen}
        options={{ tabBarLabel: 'Destinations' }}
      />
      <Tab.Screen
        name="ContactsTab"
        component={ContactsScreen}
        options={{ tabBarLabel: 'Family' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
};
