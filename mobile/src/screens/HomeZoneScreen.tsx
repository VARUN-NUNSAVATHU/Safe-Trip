import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { useSafeRoute } from '../hooks/useSafeRouteState';
import { ScreenHeader } from '../components/ScreenHeader';
import { SafeButton } from '../components/SafeButton';
import { HomeZoneMap } from '../components/HomeZoneMap';
import { WebHeader } from '../components/WebHeader';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { locationService } from '../services/locationService';
import { destinationService } from '../services/destinationService';

type Props = NativeStackScreenProps<RootStackParamList, 'SetHomeLocation'>;

// Allowed radius values as required: 100m, 200m, 300m, 500m (Default: 200m)
const RADIUS_OPTIONS = [
  { value: 100, label: '100m', tag: 'Apartment' },
  { value: 200, label: '200m', tag: 'Default' },
  { value: 300, label: '300m', tag: 'Suburban' },
  { value: 500, label: '500m', tag: 'Wide' },
];

export const HomeZoneScreen: React.FC<Props> = ({ navigation }) => {
  const { isDesktopWeb, isWideDesktop } = useResponsiveLayout();
  const { homeZone, updateHomeZone } = useSafeRoute();

  // State for Home location parameters
  const [name, setName] = useState(homeZone.name || 'Home');
  const [address, setAddress] = useState(homeZone.address || '742 Evergreen Terrace, Palo Alto, CA');
  const [latitude, setLatitude] = useState(homeZone.latitude ?? 37.4419);
  const [longitude, setLongitude] = useState(homeZone.longitude ?? -122.143);
  const [radiusMeters, setRadiusMeters] = useState(homeZone.radiusMeters || 200);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // Status & Permission states
  const [isLocating, setIsLocating] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionStatusText, setPermissionStatusText] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live physical address search autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<
    Array<{
      id: string;
      name: string;
      address: string;
      latitude: number;
      longitude: number;
    }>
  >([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const suppressNextAddressSearchRef = useRef(true);

  // Check permission on mount
  useEffect(() => {
    checkInitialPermission();
  }, []);

  // Live debounced address autocomplete when user types in Home Address Search
  useEffect(() => {
    if (suppressNextAddressSearchRef.current) return;
    const trimmed = address.trim();
    if (trimmed.length < 2) {
      setAddressSuggestions([]);
      setIsSearchingAddress(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const results = await destinationService.searchPlaces(trimmed, latitude, longitude);
        if (!cancelled && !suppressNextAddressSearchRef.current) {
          setAddressSuggestions(results);
        }
      } catch (err) {
        console.warn('Home address search error:', err);
      } finally {
        if (!cancelled) setIsSearchingAddress(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [address, latitude, longitude]);

  const checkInitialPermission = async () => {
    const result = await locationService.checkPermission();
    if (result.status === 'denied') {
      setPermissionDenied(true);
      setPermissionStatusText('Location permission is currently disabled.');
    }
  };

  /**
   * Request permission and retrieve current GPS location
   */
  const handleFetchCurrentGPS = async () => {
    setIsLocating(true);
    setPermissionDenied(false);

    try {
      // 1. Request foreground location permission
      const permResult = await locationService.requestPermission();

      if (!permResult.granted && permResult.status === 'denied') {
        setPermissionDenied(true);
        setPermissionStatusText(
          'Location access was denied. Please allow location permissions in your device settings or browser address bar.'
        );
        setIsLocating(false);
        return;
      }

      // 2. Fetch current GPS coordinates and reverse geocode address
      const coords = await locationService.getCurrentLocation();
      suppressNextAddressSearchRef.current = true;
      setAddressSuggestions([]);
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      setAccuracy(coords.accuracy);

      if (coords.address) {
        setAddress(coords.address);
      }
      setPermissionDenied(false);
    } catch (error: any) {
      console.warn('GPS fetch error:', error);
      if (error?.message === 'PERMISSION_DENIED') {
        setPermissionStatusText(
          'Location access was blocked. Please enable location permissions in your browser or device settings.'
        );
        setPermissionDenied(true);
      } else {
        // Seamless fallback to safe default coordinates so user is never blocked
        suppressNextAddressSearchRef.current = true;
        setAddressSuggestions([]);
        setLatitude(37.4419);
        setLongitude(-122.143);
        setAddress('Palo Alto, CA');
        setPermissionDenied(false);
      }
    } finally {
      setIsLocating(false);
    }
  };

  /**
   * Open Device Settings if permission denied
   */
  const handleOpenSettings = async () => {
    await locationService.openSettings();
  };

  /**
   * Confirm and Save Home Location
   */
  const handleConfirmHome = () => {
    updateHomeZone({
      name,
      address,
      latitude,
      longitude,
      radiusMeters,
      isInside: true,
      lastInsideTime: 'Just now',
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      navigation.goBack();
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <WebHeader
        activeRoute="SetHomeLocation"
        title="Home Safe Zone"
        subtitle="Configure your private home perimeter & automatic departure trigger radius"
      />

      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={[styles.scrollContent, isDesktopWeb && styles.webScrollContent]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...(Platform.OS === 'web' ? ({ 'data-scroll-container': 'true' } as any) : {})}
      >
        <View style={[styles.responsiveShell, isDesktopWeb && styles.webResponsiveShell]}>
          {!isDesktopWeb && (
            <ScreenHeader
              title="Set Home Location"
              subtitle="Configure your safe home perimeter & GPS coordinates"
              showBack
              onBack={() => navigation.goBack()}
            />
          )}

          {/* Permission Denied Card (if denied) */}
          {permissionDenied && (
            <View style={styles.warningCard}>
              <View style={styles.warningHeaderRow}>
                <Ionicons name="warning" size={22} color={COLORS.warningOrange} />
                <Text style={styles.warningTitle}>Location Permission Required</Text>
              </View>
              <Text style={styles.warningBody}>
                {permissionStatusText ||
                  'SafeTrip requires location access to set your Home coordinates and detect when you leave home. Your coordinates remain private on your device.'}
              </Text>
              <View style={styles.warningActionRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleOpenSettings}
                  style={styles.openSettingsBtn}
                >
                  <Ionicons name="settings-outline" size={16} color={COLORS.white} />
                  <Text style={styles.openSettingsBtnText}>Open Device Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleFetchCurrentGPS}
                  style={styles.retryBtn}
                >
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={isWideDesktop ? styles.webColumnsRow : undefined}>
            <View style={isWideDesktop ? styles.webLeftCol : undefined}>
              {/* Live Interactive Leaflet Map with Real Street/Satellite Tiles, Geofence Circle & Click-to-Move */}
              <HomeZoneMap
                latitude={latitude}
                longitude={longitude}
                radiusMeters={radiusMeters}
                locationName={name}
                address={address}
                height={isWideDesktop ? 440 : 320}
                onLocationChange={async (newLat, newLon) => {
                  suppressNextAddressSearchRef.current = true;
                  setAddressSuggestions([]);
                  setLatitude(newLat);
                  setLongitude(newLon);
                  const resolved = await locationService.reverseGeocode(newLat, newLon);
                  setAddress(resolved);
                }}
              />
            </View>

            <View style={isWideDesktop ? styles.webRightCol : undefined}>

        {/* Selected Location Details Card */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Selected Location</Text>
            {accuracy && (
              <View style={styles.accuracyBadge}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.tealPrimary} />
                <Text style={styles.accuracyText}>±{Math.round(accuracy)}m GPS accuracy</Text>
              </View>
            )}
          </View>

          {/* GPS Coordinates Display */}
          <View style={styles.coordsGrid}>
            <View style={styles.coordItem}>
              <Text style={styles.coordLabel}>Latitude</Text>
              <Text style={styles.coordValue}>
                {Math.abs(latitude).toFixed(6)}° {latitude >= 0 ? 'N' : 'S'}
              </Text>
            </View>
            <View style={styles.coordDivider} />
            <View style={styles.coordItem}>
              <Text style={styles.coordLabel}>Longitude</Text>
              <Text style={styles.coordValue}>
                {Math.abs(longitude).toFixed(6)}° {longitude >= 0 ? 'E' : 'W'}
              </Text>
            </View>
          </View>

          {/* Live Address Search & Autocomplete */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Search Home Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="search" size={18} color={COLORS.tealPrimary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={address}
                onChangeText={(txt) => {
                  suppressNextAddressSearchRef.current = false;
                  setAddress(txt);
                }}
                placeholder="Search street, apartment, neighborhood, or landmark..."
                placeholderTextColor={COLORS.grayTextMuted}
              />
              {address.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    suppressNextAddressSearchRef.current = false;
                    setAddress('');
                    setAddressSuggestions([]);
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={COLORS.grayTextMuted} />
                </TouchableOpacity>
              )}
            </View>

            {isSearchingAddress && (
              <View style={styles.addressSearchingRow}>
                <ActivityIndicator size="small" color={COLORS.tealPrimary} />
                <Text style={styles.addressSearchingText}>Searching addresses...</Text>
              </View>
            )}

            {addressSuggestions.length > 0 && (
              <View style={styles.addressDropdown}>
                {addressSuggestions.map((item, idx) => (
                  <TouchableOpacity
                    key={item.id + '_' + idx}
                    activeOpacity={0.75}
                    onPress={() => {
                      suppressNextAddressSearchRef.current = true;
                      setIsSearchingAddress(false);
                      setAddress(item.address);
                      setLatitude(item.latitude);
                      setLongitude(item.longitude);
                      if (!name.trim() || name === 'Home') {
                        setName('Home');
                      }
                      setAddressSuggestions([]);
                    }}
                    style={[
                      styles.addressSuggestionItem,
                      idx === addressSuggestions.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.addressSuggestionIcon}>
                      <Ionicons name="location-sharp" size={15} color={COLORS.tealPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addressSuggestionTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.addressSuggestionSub} numberOfLines={1}>
                        {item.address}
                      </Text>
                    </View>
                    <View style={styles.addressPickPill}>
                      <Text style={styles.addressPickText}>Select</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Zone Name Label */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location Label</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="bookmark-outline" size={18} color={COLORS.grayTextSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Home, Apartment, Dorm"
                placeholderTextColor={COLORS.grayTextMuted}
              />
            </View>
          </View>

          {/* Get Current GPS Location CTA */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleFetchCurrentGPS}
            disabled={isLocating}
            style={styles.gpsButton}
          >
            {isLocating ? (
              <ActivityIndicator color={COLORS.brandGreenDark} size="small" />
            ) : (
              <>
                <Ionicons name="navigate-circle" size={20} color={COLORS.brandGreenDark} />
                <Text style={styles.gpsButtonText}>Get Current GPS Location</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Geofence Radius Configuration */}
        <View style={styles.cardSection}>
          <View style={styles.radiusHeaderRow}>
            <Text style={styles.sectionHeading}>Geofence Radius</Text>
            <View style={styles.currentRadiusBadge}>
              <Text style={styles.currentRadiusText}>{radiusMeters} meters</Text>
            </View>
          </View>

          <Text style={styles.radiusDesc}>
            SafeTrip will trigger the travel reminder alarm when you step outside this radius.
          </Text>

          {/* Radius selector: 100m, 200m (Default), 300m, 500m */}
          <View style={styles.radiusGrid}>
            {RADIUS_OPTIONS.map((opt) => {
              const isSelected = radiusMeters === opt.value;
              const isDefault = opt.value === 200;

              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.8}
                  onPress={() => setRadiusMeters(opt.value)}
                  style={[
                    styles.radiusCard,
                    isSelected && styles.radiusCardSelected,
                  ]}
                >
                  <Text style={[styles.radiusCardNumber, isSelected && styles.radiusCardNumberSelected]}>
                    {opt.label}
                  </Text>
                  <View
                    style={[
                      styles.radiusTag,
                      isSelected && styles.radiusTagSelected,
                      isDefault && !isSelected && styles.defaultTagStyle,
                    ]}
                  >
                    <Text
                      style={[
                        styles.radiusTagText,
                        isSelected && styles.radiusTagTextSelected,
                        isDefault && !isSelected && styles.defaultTagTextStyle,
                      ]}
                    >
                      {opt.tag}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Confirm & Save Home Location CTA */}
        {savedSuccess ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.tealPrimary} />
            <View style={styles.successTexts}>
              <Text style={styles.successTitle}>Home Location Confirmed & Saved!</Text>
              <Text style={styles.successSub}>
                Perimeter set to {radiusMeters}m. Returning to dashboard...
              </Text>
            </View>
          </View>
        ) : (
          <SafeButton
            title="Confirm & Save Home Location"
            variant="teal"
            size="lg"
            onPress={handleConfirmHome}
            icon={<Ionicons name="shield-checkmark" size={20} color={COLORS.white} />}
            style={styles.confirmBtn}
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
    maxWidth: 1220,
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
    flex: 1.15,
    minWidth: 0,
  },
  webRightCol: {
    flex: 1,
    minWidth: 0,
  },
  warningCard: {
    backgroundColor: COLORS.warningSoft,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.warningBorder,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
    ...SHADOWS.subtle,
  },
  warningHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.warningOrange,
    marginLeft: 6,
  },
  warningBody: {
    fontSize: 13,
    color: COLORS.navyPrimary,
    lineHeight: 18,
    marginVertical: 6,
  },
  warningActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  openSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningOrange,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
  },
  openSettingsBtnText: {
    color: COLORS.white,
    fontSize: 12.5,
    fontWeight: '700',
    marginLeft: 4,
  },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  retryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  mapVisualCard: {
    height: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  mapGridPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.2,
  },
  streetLineH1: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#E2E8F0',
  },
  streetLineH2: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#E2E8F0',
  },
  streetLineV1: {
    position: 'absolute',
    left: 80,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#E2E8F0',
  },
  streetLineV2: {
    position: 'absolute',
    right: 90,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#E2E8F0',
  },
  geofenceRingOuter: {
    backgroundColor: 'rgba(66, 184, 63, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(66, 184, 63, 0.4)',
    borderRadius: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  geofenceRingInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(66, 184, 63, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homePinCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glowGreen,
  },
  mapBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.subtle,
  },
  badgePulseTeal: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brandGreen,
    marginRight: 6,
  },
  mapBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  cardSection: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    ...SHADOWS.subtle,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  accuracyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  accuracyText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.tealPrimary,
    marginLeft: 3,
  },
  coordsGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.graySubtle,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  coordItem: {
    flex: 1,
    alignItems: 'center',
  },
  coordLabel: {
    fontSize: 11,
    color: COLORS.grayTextMuted,
    marginBottom: 2,
  },
  coordValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  coordDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.grayBorder,
  },
  inputGroup: {
    marginBottom: SPACING.sm,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.navyPrimary,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.graySubtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  textInput: {
    flex: 1,
    height: 44,
    fontSize: 13.5,
    color: COLORS.navyPrimary,
  },
  addressSearchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  addressSearchingText: {
    fontSize: 12,
    color: COLORS.tealPrimary,
    fontWeight: '600',
  },
  addressDropdown: {
    marginTop: 6,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    overflow: 'hidden',
    ...SHADOWS.subtle,
  },
  addressSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  addressSuggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.brandGreenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressSuggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  addressSuggestionSub: {
    fontSize: 11.5,
    color: COLORS.grayTextSecondary,
    marginTop: 1,
  },
  addressPickPill: {
    backgroundColor: COLORS.brandGreenSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
  },
  addressPickText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.brandGreenDark,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 6,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.brandGreenSoft,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
  },
  gpsButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandGreenDark,
    marginLeft: 6,
  },
  radiusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentRadiusBadge: {
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.tealMuted,
  },
  currentRadiusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tealPrimary,
  },
  radiusDesc: {
    fontSize: 12.5,
    color: COLORS.grayTextSecondary,
    marginVertical: SPACING.xs,
    lineHeight: 18,
  },
  radiusGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.xs,
  },
  radiusCard: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.graySubtle,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
  },
  radiusCardSelected: {
    backgroundColor: COLORS.tealSoft,
    borderColor: COLORS.tealPrimary,
    ...SHADOWS.glowTeal,
  },
  radiusCardNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  radiusCardNumberSelected: {
    color: COLORS.tealPrimary,
  },
  radiusTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 4,
  },
  radiusTagSelected: {
    backgroundColor: COLORS.tealPrimary,
  },
  defaultTagStyle: {
    backgroundColor: '#E0F2FE',
  },
  radiusTagText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: COLORS.grayTextMuted,
  },
  radiusTagTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  defaultTagTextStyle: {
    color: COLORS.bluePrimary,
    fontWeight: '700',
  },
  confirmBtn: {
    marginTop: SPACING.xs,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tealSoft,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.tealMuted,
  },
  successTexts: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.tealPrimary,
  },
  successSub: {
    fontSize: 12,
    color: COLORS.grayTextSecondary,
    marginTop: 1,
  },
});
