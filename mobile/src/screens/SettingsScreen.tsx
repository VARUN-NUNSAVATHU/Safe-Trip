import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { useSafeRoute } from '../hooks/useSafeRouteState';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenHeader } from '../components/ScreenHeader';
import { SafeButton } from '../components/SafeButton';
import { WebHeader } from '../components/WebHeader';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

export const SettingsScreen: React.FC = () => {
  const { isDesktopWeb, isWideDesktop } = useResponsiveLayout();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    user,
    homeZone,
    settings,
    updateSettings,
    isGeofenceMonitoring,
    toggleGeofenceMonitoring,
    logout,
    isCloudSynced,
  } = useSafeRoute();

  const handleLogout = async () => {
    await AsyncStorage.setItem('@saferoute_logged_out', 'true');
    await AsyncStorage.removeItem('@saferoute_last_screen');
    await logout();
    navigation.replace('Splash');
  };

  const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Guest User');
  const displayEmail = user.email || 'Not signed in';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'ST';

  return (
    <View style={styles.container}>
      <WebHeader
        activeRoute="SettingsTab"
        title="Account & Safety Settings"
        subtitle="Manage home geofence parameters, alert sounds & privacy preferences"
      />

      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={[styles.scrollContent, isDesktopWeb && styles.webScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.responsiveShell, isDesktopWeb && styles.webResponsiveShell]}>
          {!isDesktopWeb && (
            <ScreenHeader
              title="Settings"
              subtitle="App preferences & geofence parameters"
            />
          )}
          <View style={isWideDesktop ? styles.webColumnsRow : undefined}>
            <View style={isWideDesktop ? styles.webLeftCol : undefined}>
              {/* User Profile Card */}
              <View style={styles.profileCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{displayName}</Text>
                  <Text style={styles.profileEmail}>{displayEmail}</Text>
                  <View style={styles.badgeProtected}>
                    <Ionicons
                      name={isCloudSynced ? 'cloud-done-outline' : 'shield-checkmark-outline'}
                      size={12}
                      color={isCloudSynced ? COLORS.tealPrimary : '#F59E0B'}
                    />
                    <Text style={styles.badgeProtectedText}>
                      {isCloudSynced ? 'Cloud REST API Connected' : 'Local Storage Mode'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Section: About & Privacy */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeading}>Safety & Privacy</Text>

                <View style={styles.settingRowInfo}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.grayTextSecondary} style={styles.staticIcon} />
                  <Text style={styles.staticText}>Location data is encrypted and private</Text>
                </View>

                <View style={styles.settingRowInfo}>
                  <Ionicons name="code-slash-outline" size={18} color={COLORS.grayTextSecondary} style={styles.staticIcon} />
                  <Text style={styles.staticText}>SafeTrip v1.0.0 (Web & Mobile)</Text>
                </View>
              </View>

              {isWideDesktop && (
                <SafeButton
                  title="Sign Out"
                  variant="outline"
                  size="md"
                  onPress={handleLogout}
                  icon={<Ionicons name="log-out-outline" size={18} color={COLORS.navyPrimary} />}
                  style={styles.logoutBtn}
                />
              )}
            </View>

            <View style={isWideDesktop ? styles.webRightCol : undefined}>
              {/* Section: Geofence Detection */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeading}>Geofence Detection</Text>
            <View
              style={[
                styles.statusBadge,
                isGeofenceMonitoring ? styles.statusBadgeActive : styles.statusBadgePaused,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  isGeofenceMonitoring ? styles.statusDotActive : styles.statusDotPaused,
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  isGeofenceMonitoring ? styles.statusBadgeTextActive : styles.statusBadgeTextPaused,
                ]}
              >
                {isGeofenceMonitoring ? 'ACTIVE' : 'PAUSED'}
              </Text>
            </View>
          </View>

          {/* Master Geofence Toggle */}
          <View style={styles.settingRowToggle}>
            <View style={styles.rowIconCircle}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={isGeofenceMonitoring ? COLORS.tealPrimary : COLORS.grayTextMuted}
              />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowTitle}>Home Geofencing Reminder</Text>
              <Text style={styles.rowSubtitle}>
                {isGeofenceMonitoring
                  ? `Monitoring ${homeZone.radiusMeters}m safe perimeter`
                  : 'Geofence detection paused'}
              </Text>
            </View>
            <Switch
              value={isGeofenceMonitoring}
              onValueChange={(val) => {
                toggleGeofenceMonitoring(val);
              }}
              trackColor={{ false: COLORS.grayBorder, true: COLORS.tealPrimary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.divider} />

          {/* Configure Home Location */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('SetHomeLocation')}
            style={styles.settingRowAction}
          >
            <View style={styles.rowIconCircle}>
              <Ionicons name="home-outline" size={18} color={COLORS.tealPrimary} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowTitle}>Home Zone Location</Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {homeZone.address} ({homeZone.radiusMeters}m radius)
              </Text>
            </View>
            <View style={styles.glassChevron}>
              <Ionicons name="chevron-forward" size={14} color={COLORS.brandGreen} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.settingRowToggle}>
            <View style={styles.rowIconCircle}>
              <Ionicons name="flash-outline" size={18} color={COLORS.bluePrimary} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowTitle}>Auto-Prompt on Boundary Exit</Text>
              <Text style={styles.rowSubtitle}>Trigger alarm as soon as you step out of home</Text>
            </View>
            <Switch
              value={settings.autoPromptOnExit}
              onValueChange={(val) => updateSettings({ autoPromptOnExit: val })}
              trackColor={{ false: COLORS.grayBorder, true: COLORS.tealPrimary }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        {/* Section: Alarm & Notification Preferences */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Alarm & Alert Sound</Text>

          <View style={styles.settingRowToggle}>
            <View style={styles.rowIconCircle}>
              <Ionicons name="volume-high-outline" size={18} color={COLORS.tealPrimary} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowTitle}>Audible Reminder Alarm</Text>
              <Text style={styles.rowSubtitle}>Loud, distinct chime when exiting home zone</Text>
            </View>
            <Switch
              value={settings.alarmSoundEnabled}
              onValueChange={(val) => updateSettings({ alarmSoundEnabled: val })}
              trackColor={{ false: COLORS.grayBorder, true: COLORS.tealPrimary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRowToggle}>
            <View style={styles.rowIconCircle}>
              <Ionicons name="phone-portrait-outline" size={18} color={COLORS.navyPrimary} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowTitle}>Haptic Vibration</Text>
              <Text style={styles.rowSubtitle}>Vibrate phone during geofence prompt</Text>
            </View>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={(val) => updateSettings({ vibrationEnabled: val })}
              trackColor={{ false: COLORS.grayBorder, true: COLORS.tealPrimary }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        {/* Logout CTA (Mobile & Narrow Screens) */}
        {!isWideDesktop && (
          <SafeButton
            title="Sign Out"
            variant="outline"
            size="md"
            onPress={handleLogout}
            icon={<Ionicons name="log-out-outline" size={18} color={COLORS.navyPrimary} />}
            style={styles.logoutBtn}
          />
        )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    width: '100%',
  },
  mainScrollView: {
    flex: 1,
    width: '100%',
  },
  responsiveShell: {
    width: '100%',
    alignSelf: 'center',
  },
  webResponsiveShell: {
    maxWidth: 1180,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    width: '100%',
  },
  webScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 110,
  },
  webColumnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },
  webLeftCol: {
    flex: 0.9,
    minWidth: 0,
  },
  webRightCol: {
    flex: 1.25,
    minWidth: 0,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    ...SHADOWS.subtle,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.brandGreenSoft,
    borderWidth: 1.5,
    borderColor: COLORS.brandGreenMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.brandGreenDark,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  profileEmail: {
    fontSize: 12.5,
    color: COLORS.grayTextSecondary,
    marginTop: 1,
  },
  badgeProtected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.tealMuted,
  },
  badgeProtectedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.tealPrimary,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    ...SHADOWS.subtle,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: COLORS.tealSoft,
    borderColor: COLORS.tealMuted,
  },
  statusBadgePaused: {
    backgroundColor: COLORS.graySubtle,
    borderColor: COLORS.grayBorder,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusDotActive: {
    backgroundColor: COLORS.tealPrimary,
  },
  statusDotPaused: {
    backgroundColor: COLORS.grayTextMuted,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadgeTextActive: {
    color: COLORS.tealPrimary,
  },
  statusBadgeTextPaused: {
    color: COLORS.grayTextSecondary,
  },
  settingRowAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingRowToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.graySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  rowTextCol: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.navyPrimary,
  },
  rowSubtitle: {
    fontSize: 11.5,
    color: COLORS.grayTextSecondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.graySubtle,
    marginVertical: 8,
  },
  settingRowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  staticIcon: {
    marginRight: SPACING.sm,
  },
  staticText: {
    fontSize: 12.5,
    color: COLORS.grayTextSecondary,
  },
  logoutBtn: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  glassChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(66,184,63,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(66,184,63,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
