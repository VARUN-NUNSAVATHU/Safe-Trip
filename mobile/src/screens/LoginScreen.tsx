import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../utils/theme';
import { useSafeRoute } from '../hooks/useSafeRouteState';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

/**
 * LoginScreen delegates immediately to MainTabs with in-place Auth Box.
 * Eliminates separate full login screen as requested.
 */
export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { openAuthModal } = useSafeRoute();

  useEffect(() => {
    navigation.replace('MainTabs');
    openAuthModal('login');
  }, [navigation, openAuthModal]);

  return <View style={{ flex: 1, backgroundColor: COLORS.bgSecondary }} />;
};
