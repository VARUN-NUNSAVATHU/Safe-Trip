import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../utils/theme';
import { useSafeRoute } from '../hooks/useSafeRouteState';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { IMAGES } from '../utils/imageAssets';

interface WebHeaderProps {
  activeRoute?: string;
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export const WebHeader: React.FC<WebHeaderProps> = ({
  activeRoute,
  title,
  subtitle,
  rightAction,
}) => {
  const { isDesktopWeb, isWideDesktop } = useResponsiveLayout();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, activeTrip, triggerGeofenceExitAlert, openAuthModal } = useSafeRoute();

  // Only render top website navbar on Desktop Web browsers; phones keep native mobile headers & bottom tabs
  if (!isDesktopWeb) {
    return null;
  }

  const displayName = user.name
    ? user.name.split(' ')[0]
    : user.email
    ? user.email.split('@')[0]
    : 'Guest';

  const navItems = [
    { label: 'Dashboard', route: 'HomeTab', isTab: true, icon: 'grid-outline' as const },
    { label: 'Plan Journey', route: 'StartTrip', isTab: false, icon: 'navigate-outline' as const },
    { label: 'Destinations', route: 'DestinationsTab', isTab: true, icon: 'location-outline' as const },
    { label: 'Family', route: 'ContactsTab', isTab: true, icon: 'people-outline' as const },
    { label: 'Home Zone', route: 'SetHomeLocation', isTab: false, icon: 'shield-checkmark-outline' as const },
    { label: 'Settings', route: 'SettingsTab', isTab: true, icon: 'settings-outline' as const },
  ];

  const handleNavigate = (item: (typeof navItems)[0]) => {
    if (item.route === 'StartTrip' && !user.email) {
      openAuthModal('login');
      return;
    }
    if (item.isTab) {
      (navigation as any).navigate('MainTabs', { screen: item.route });
    } else {
      (navigation as any).navigate(item.route, {});
    }
  };

  return (
    <View style={styles.headerWrapper}>
      <View style={[styles.headerInner, !isWideDesktop && styles.headerInnerCompact]}>
        {/* Left: SafeTrip Shield Logo & Brand Title */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => (navigation as any).navigate('MainTabs', { screen: 'HomeTab' })}
          style={styles.brandBlock}
        >
          <View style={styles.brandIconWrap}>
            <Image
              source={IMAGES.logoShieldTransparent}
              style={styles.brandLogoImg}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.brandTitle}>SafeTrip</Text>
            <Text style={styles.brandTagline}>Web Portal</Text>
          </View>
        </TouchableOpacity>

        {/* Center: Desktop Website Navigation Links */}
        <View style={[styles.desktopNavRow, !isWideDesktop && { gap: 2 }]}>
          {navItems.map((item) => {
            const isActive = activeRoute === item.route;
            return (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.7}
                onPress={() => handleNavigate(item)}
                style={[
                  styles.navLinkItem,
                  !isWideDesktop && styles.navLinkItemCompact,
                  isActive && styles.navLinkItemActive,
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={isActive ? COLORS.tealPrimary : '#64748B'}
                  style={{ marginRight: isWideDesktop ? 6 : 4 }}
                />
                <Text
                  style={[
                    styles.navLinkText,
                    !isWideDesktop && { fontSize: 12 },
                    isActive && styles.navLinkTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Right: Live Status & User Actions */}
        <View style={styles.headerRightActions}>
          {activeTrip && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ActiveTrip')}
              style={styles.activeTripBeacon}
            >
              <View style={styles.beaconPulse} />
              <Text style={styles.beaconText}>Live Trip</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={triggerGeofenceExitAlert}
            style={styles.testExitBtn}
          >
            <Ionicons name="warning-outline" size={14} color="#EA580C" />
            {isWideDesktop && <Text style={styles.testExitText}>Test Exit</Text>}
          </TouchableOpacity>

          {user.email ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => (navigation as any).navigate('MainTabs', { screen: 'SettingsTab' })}
              style={styles.userBadge}
            >
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
              {isWideDesktop && (
                <Text style={styles.userName} numberOfLines={1}>
                  {displayName}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openAuthModal('login')}
              style={styles.signInBtn}
            >
              <Ionicons name="log-in-outline" size={14} color="#FFFFFF" />
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Optional Page Title Strip */}
      {title && (
        <View style={styles.pageTitleStrip}>
          <View style={styles.pageTitleInner}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.pageTitleHeading}>{title}</Text>
              {subtitle && <Text style={styles.pageTitleSubtitle}>{subtitle}</Text>}
            </View>
            {rightAction && <View>{rightAction}</View>}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 100,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  headerInner: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    height: 68,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerInnerCompact: {
    paddingHorizontal: 14,
    height: 62,
    gap: 6,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.brandGreenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
  },
  brandLogoImg: {
    width: 28,
    height: 28,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  brandTagline: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.tealPrimary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  desktopNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  navLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  navLinkItemCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  navLinkItemActive: {
    backgroundColor: COLORS.brandGreenSoft,
  },
  navLinkText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  navLinkTextActive: {
    color: COLORS.brandGreen,
    fontWeight: '700',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeTripBeacon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    gap: 6,
  },
  beaconPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brandGreen,
  },
  beaconText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.brandGreenDark,
  },
  testExitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 5,
  },
  testExitText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 7,
  },
  userAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.tealPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
    maxWidth: 110,
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tealPrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 5,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  signInBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pageTitleStrip: {
    backgroundColor: COLORS.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  pageTitleInner: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitleHeading: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  pageTitleSubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
});
