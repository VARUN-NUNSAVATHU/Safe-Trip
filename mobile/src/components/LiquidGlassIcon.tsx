import React from 'react';
import { View, ViewStyle, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface LiquidGlassIconProps {
  size: number;
  color: string; // tint color (hex)
  icon: string;  // Ionicons name
  iconColor?: string;
  style?: ViewStyle;
}

export const LiquidGlassIcon: React.FC<LiquidGlassIconProps> = ({
  size,
  color,
  icon,
  iconColor = '#FFFFFF',
  style,
}) => {
  const radius = Math.round(size * 0.28); // Continuous iOS squircle corner radius

  // Parse hex color to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 66, g: 184, b: 63 };
  };
  const { r, g, b } = hexToRgb(color);

  const webBackdropStyle: any = Platform.OS === 'web'
    ? {
        backdropFilter: 'blur(22px) saturate(210%)',
        WebkitBackdropFilter: 'blur(22px) saturate(210%)',
        boxShadow: `0 8px 24px rgba(${r},${g},${b},0.32), inset 0 1px 1px rgba(255,255,255,0.8)`,
      }
    : {};

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          // Ambient soft colored drop shadow
          shadowColor: color,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.38,
          shadowRadius: 10,
          elevation: 8,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[
          'rgba(255,255,255,0.45)',
          `rgba(${r},${g},${b},0.78)`,
          `rgba(${r},${g},${b},0.95)`,
          'rgba(0,0,0,0.08)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderTopColor: 'rgba(255,255,255,0.75)',
            borderLeftColor: 'rgba(255,255,255,0.5)',
            borderRightColor: 'rgba(255,255,255,0.2)',
            borderBottomColor: 'rgba(0,0,0,0.1)',
            overflow: 'hidden',
          },
          webBackdropStyle,
        ]}
      >
        {/* Specular gloss top reflection bar (iPhone liquid glass look) */}
        <LinearGradient
          colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.05)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: size * 0.48,
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
          }}
          pointerEvents="none"
        />

        {/* Diagonal specular sheen streak */}
        <View
          style={{
            position: 'absolute',
            top: 1,
            left: 2,
            width: size * 0.35,
            height: size * 0.22,
            borderRadius: radius * 0.6,
            backgroundColor: 'rgba(255,255,255,0.28)',
            transform: [{ rotate: '-18deg' }],
          }}
          pointerEvents="none"
        />

        <Ionicons
          name={icon as any}
          size={Math.round(size * 0.48)}
          color={iconColor}
        />
      </LinearGradient>
    </View>
  );
};
