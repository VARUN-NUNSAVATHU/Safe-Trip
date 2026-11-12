import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../utils/theme';

interface SafeButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'teal' | 'blue' | 'navy' | 'warning' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  showArrow?: boolean;
}

export const SafeButton: React.FC<SafeButtonProps> = ({
  title,
  onPress,
  variant = 'teal',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
  showArrow = false,
}) => {
  const handlePress = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
    if (onPress) {
      onPress();
    }
  };

  const getPaddingStyle = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 16, borderRadius: RADIUS.full };
      case 'lg':
        return { paddingVertical: 18, paddingHorizontal: 30, borderRadius: RADIUS.full };
      case 'md':
      default:
        return { paddingVertical: 14, paddingHorizontal: 24, borderRadius: RADIUS.full };
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'sm': return 13;
      case 'lg': return 17;
      case 'md':
      default: return 15;
    }
  };

  const getArrowSize = (): number => {
    switch (size) {
      case 'sm': return 18;
      case 'lg': return 26;
      default: return 22;
    }
  };

  const isGradient = variant === 'teal' || variant === 'blue';
  const isWarning = variant === 'warning';
  const isNavy = variant === 'navy';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  const textColor = isOutline || isGhost
    ? (isOutline ? COLORS.textPrimary : COLORS.brandGreenDark)
    : COLORS.white;

  const padding = getPaddingStyle();
  const fontSize = getFontSize();
  const arrowSize = getArrowSize();

  const innerContent = loading ? (
    <ActivityIndicator color={textColor} size="small" />
  ) : (
    <View style={styles.innerRow}>
      {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
      <Text
        style={[
          styles.text,
          { color: textColor, fontSize, flex: showArrow ? 1 : undefined, textAlign: showArrow ? 'left' : 'center' },
          textStyle,
        ]}
      >
        {title}
      </Text>
      {showArrow && (
        <View style={[styles.arrowBadge, { width: arrowSize, height: arrowSize, borderRadius: arrowSize / 2 }]}>
          <Ionicons name="arrow-forward" size={arrowSize * 0.55} color={isOutline || isGhost ? COLORS.brandGreen : '#fff'} />
        </View>
      )}
    </View>
  );

  const webProps: any = Platform.OS === 'web'
    ? {
        onClick: (e: any) => {
          e?.stopPropagation?.();
          handlePress();
        },
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        accessibilityRole: 'button',
      }
    : {};

  if (isGradient) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[styles.base, disabled && styles.disabled, style]}
        {...webProps}
      >
        <LinearGradient
          colors={['#52D14F', '#42B83F', '#2E8B2B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          style={[
            styles.gradientInner,
            padding,
            {
              borderTopColor: 'rgba(255,255,255,0.4)',
              borderTopWidth: 1,
              borderLeftColor: 'rgba(255,255,255,0.15)',
              borderLeftWidth: 1,
              borderBottomColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomWidth: 0,
              borderRightWidth: 0,
              ...SHADOWS.glowGreen,
            },
          ]}
        >
          {innerContent}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (isWarning) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[styles.base, disabled && styles.disabled, style]}
        {...webProps}
      >
        <LinearGradient
          colors={['#FB923C', '#F97316', '#EA580C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          style={[
            styles.gradientInner,
            padding,
            {
              borderTopColor: 'rgba(255,255,255,0.3)',
              borderTopWidth: 1,
              borderLeftColor: 'rgba(255,255,255,0.1)',
              borderLeftWidth: 1,
              borderBottomWidth: 0,
              borderRightWidth: 0,
              ...SHADOWS.glowOrange,
            },
          ]}
        >
          {innerContent}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (isNavy) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[
          styles.base,
          styles.navyBtn,
          padding,
          disabled && styles.disabled,
          style,
        ]}
        {...webProps}
      >
        {innerContent}
      </TouchableOpacity>
    );
  }

  if (isOutline) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[
          styles.base,
          styles.outlineBtn,
          padding,
          disabled && styles.disabled,
          style,
        ]}
        {...webProps}
      >
        {innerContent}
      </TouchableOpacity>
    );
  }

  // ghost
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[styles.base, padding, disabled && styles.disabled, style]}
      {...webProps}
    >
      {innerContent}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', userSelect: 'none' } as any) : {}),
  },
  gradientInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.5,
  },
  arrowBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  navyBtn: {
    backgroundColor: COLORS.textPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  outlineBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
});
