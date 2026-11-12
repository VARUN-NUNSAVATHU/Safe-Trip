import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS } from '../utils/theme';

interface QuickActionButtonProps {
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  colorVariant: 'teal' | 'blue' | 'navy' | 'orange';
  onPress: () => void;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  title,
  subtitle,
  iconName,
  colorVariant,
  onPress,
}) => {
  const getGradientColors = (): [string, string] => {
    switch (colorVariant) {
      case 'teal':
        return ['#52D14F', '#369E33'];
      case 'blue':
        return ['#34D399', '#059669'];
      case 'navy':
        return ['#334155', '#0F172A'];
      case 'orange':
        return ['#FB923C', '#EA580C'];
    }
  };

  const getSubtleBg = () => {
    switch (colorVariant) {
      case 'teal':
        return COLORS.brandGreenSoft;
      case 'blue':
        return '#ECFDF5';
      case 'navy':
        return '#F1F5F9';
      case 'orange':
        return COLORS.warningSoft;
    }
  };

  const webCardStyle: any = Platform.OS === 'web'
    ? {
        backdropFilter: 'blur(12px)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }
    : {};

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.card, webCardStyle]}
    >
      <View style={styles.topRow}>
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBox}
        >
          <View style={styles.iconSpecular} />
          <Ionicons name={iconName} size={18} color="#FFFFFF" />
        </LinearGradient>

        <View style={styles.arrowPill}>
          <Ionicons name="arrow-forward" size={11} color={COLORS.brandGreenDark} />
        </View>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(66, 184, 63, 0.18)',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11, // iOS squircle
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: COLORS.brandGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  iconSpecular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  arrowPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.brandGreenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
});
