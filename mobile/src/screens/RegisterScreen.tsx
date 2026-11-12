import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../utils/theme';
import { useSafeRoute } from '../hooks/useSafeRouteState';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

/**
 * RegisterScreen delegates immediately to MainTabs with in-place Auth Box.
 * Eliminates separate full register screen as requested.
 */
export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { openAuthModal } = useSafeRoute();

  useEffect(() => {
    navigation.replace('MainTabs');
    openAuthModal('register');
  }, [navigation, openAuthModal]);

  return <View style={{ flex: 1, backgroundColor: COLORS.bgSecondary }} />;
};
