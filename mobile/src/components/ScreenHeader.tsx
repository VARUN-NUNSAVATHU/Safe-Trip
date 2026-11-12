import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../utils/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  dark?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  dark = false,
}) => {
  return (
    <View style={[styles.container, dark && styles.darkContainer]}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity activeOpacity={0.7} onPress={onBack} style={styles.backBtn}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={dark ? COLORS.white : COLORS.navyPrimary}
            />
          </TouchableOpacity>
        )}
        <View style={styles.titleWrap}>
          <Text style={[styles.title, dark ? styles.darkTitle : styles.lightTitle]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, dark ? styles.darkSubtitle : styles.lightSubtitle]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {rightAction && <View style={styles.rightWrap}>{rightAction}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  darkContainer: {
    backgroundColor: COLORS.navyDark,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginRight: SPACING.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  lightTitle: {
    color: COLORS.textPrimary,
  },
  darkTitle: {
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  lightSubtitle: {
    color: COLORS.textSecondary,
  },
  darkSubtitle: {
    color: COLORS.textMuted,
  },
  rightWrap: {
    marginLeft: SPACING.sm,
  },
});
