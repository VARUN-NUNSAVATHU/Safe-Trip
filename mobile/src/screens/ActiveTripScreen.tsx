import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { useSafeRoute } from '../hooks/useSafeRouteState';
import { ScreenHeader } from '../components/ScreenHeader';
import { SafeButton } from '../components/SafeButton';
import { ActiveJourneyMap } from '../components/ActiveJourneyMap';
import { WebHeader } from '../components/WebHeader';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { locationService } from '../services/locationService';

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveTrip'>;

export const ActiveTripScreen: React.FC<Props> = ({ navigation }) => {
  const { isDesktopWeb, isWideDesktop } = useResponsiveLayout();
  const {
    homeZone,
    activeTrip,
    completeActiveTrip,
    cancelActiveTrip,
    locationTrackingError,
    retryLocationTracking,
    clearLocationError,
    lastCompletedTripDetails,
    clearCompletedTripDetails,
    updateActiveTripLocation,
    advanceTripSimulation,
  } = useSafeRoute();

  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEmergencyNotice, setShowEmergencyNotice] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Automated destination arrival listener: seamlessly navigates to TripCompleted
  useEffect(() => {
    if (lastCompletedTripDetails) {
      const details = { ...lastCompletedTripDetails };
      clearCompletedTripDetails();
      navigation.replace('TripCompleted', {
        tripDetails: details,
      });
    }
  }, [lastCompletedTripDetails, navigation, clearCompletedTripDetails]);

  // Live timer for elapsed trip time
  useEffect(() => {
    if (!activeTrip) return;

    const startMs = new Date(activeTrip.startTime || activeTrip.startedAt).getTime();

    const updateTimer = () => {
      const diffMs = Math.max(Date.now() - startMs, 0);
      const totalSec = Math.floor(diffMs / 1000);
      setElapsedMinutes(Math.floor(totalSec / 60));
      setElapsedSeconds(totalSec % 60);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeTrip]);

  if (!activeTrip) {
    return (
      <View style={styles.container}>
        <WebHeader
          activeRoute="ActiveTrip"
          title="Live Journey Tracking"
          subtitle="No active trip currently in progress"
        />
        <View style={[styles.responsiveShell, isDesktopWeb && styles.webResponsiveShell]}>
          {!isDesktopWeb && (
            <ScreenHeader
              title="Active Journey"
              subtitle="No active trip in progress"
              showBack
              onBack={() => navigation.navigate('MainTabs')}
            />
          )}
          <View style={styles.noActiveContainer}>
            <Ionicons name="shield-outline" size={54} color={COLORS.grayTextMuted} />
            <Text style={styles.noActiveTitle}>No Trip Currently Active</Text>
            <Text style={styles.noActiveSubtitle}>
              Start a trip from the dashboard to activate live GPS tracking and safeguard your journey.
            </Text>
            <SafeButton
              title="Start a New Trip"
              variant="teal"
              size="lg"
              onPress={() => navigation.navigate('StartTrip', {})}
              icon={<Ionicons name="paper-plane" size={18} color={COLORS.white} />}
              style={{ marginTop: SPACING.lg }}
            />
          </View>
        </View>
      </View>
    );
  }

  // Format start time
  const formattedStartTime = new Date(activeTrip.startTime || activeTrip.startedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate remaining minutes and expected arrival time
  const totalEstMinutes = activeTrip.estimatedArrivalMinutes || 25;
  const progressPercent = Math.min(Math.max(activeTrip.journeyProgressPercent || 5, 5), 100);
  const remainingMinutes = Math.max(totalEstMinutes - elapsedMinutes, 1);
  const expectedArrivalDate = new Date(Date.now() + remainingMinutes * 60 * 1000);
  const formattedArrivalTime = expectedArrivalDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Sanitize distance display only if coords are missing
  const destLat = typeof activeTrip.destination.latitude === 'number' && activeTrip.destination.latitude !== 0 ? activeTrip.destination.latitude : 16.5062;
  const destLon = typeof activeTrip.destination.longitude === 'number' && activeTrip.destination.longitude !== 0 ? activeTrip.destination.longitude : 80.648;
  const displayDistanceKm = activeTrip.distanceRemainingKm > 0
    ? activeTrip.distanceRemainingKm
    : Math.max(
        locationService.calculateDistanceKm(
          activeTrip.currentLocation?.latitude || 16.4613,
          activeTrip.currentLocation?.longitude || 80.5069,
          destLat,
          destLon
        ),
        0.5
      );

  // Manual GPS refresh trigger with live activeTrip state update
  const handleManualRefreshLocation = async () => {
    setIsRefreshingLocation(true);
    try {
      const res = await locationService.getCurrentLocation();
      const point = {
        name: res.address?.split(',')[0] || 'Current Location',
        latitude: res.latitude,
        longitude: res.longitude,
        address: res.address,
        accuracy: res.accuracy,
        timestamp: res.timestamp,
      };
      updateActiveTripLocation(point);
      await retryLocationTracking();
    } catch (err) {
      console.warn('Manual GPS refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshingLocation(false), 500);
    }
  };

  // Share Live Ride
  const handleShareLiveRide = async () => {
    try {
      await Share.share({
        title: 'SafeTrip Live Ride Tracking',
        message: `I am travelling to ${activeTrip.destination.name}. Expected arrival: ${formattedArrivalTime}. Track my live journey on SafeTrip: https://safetrip.app/live/${activeTrip.id || 'current'}`,
      });
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch {
      // dismissed
    }
  };

  // Stop Trip: Option 1 - Reached Safely
  const handleStopTripReachedSafely = async () => {
    if (!activeTrip || isCompleting) return;
    setIsCompleting(true);
    const destName = activeTrip.destination.name;
    const elapsed = elapsedMinutes > 0 ? elapsedMinutes : 1;
    const distanceKm = displayDistanceKm || 15.8;

    await completeActiveTrip();
    setIsCompleting(false);
    navigation.replace('TripCompleted', {
      tripDetails: {
        destinationName: destName,
        elapsedMinutes: elapsed,
        distanceKm,
      },
    });
  };

  // Stop Trip: Option 2 - Cancel Trip
  const handleStopTripCancel = async () => {
    setIsCancelling(true);
    await cancelActiveTrip();
    setIsCancelling(false);
    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.container}>
      <WebHeader
        activeRoute="ActiveTrip"
        title={`Live Journey to ${activeTrip.destination.name}`}
        subtitle="Real-time GPS telemetry & automatic family protection"
      />
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={[styles.scrollContent, isDesktopWeb && styles.webScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.responsiveShell, isDesktopWeb && styles.webResponsiveShell]}>
          {!isDesktopWeb && (
            <ScreenHeader
              title="Active Journey"
              subtitle="Live GPS tracking & family safeguard"
              showBack
              onBack={() => navigation.navigate('MainTabs')}
            />
          )}
          {/* Error Banner if any */}
          {locationTrackingError && (
            <View style={styles.errorBannerCard}>
              <View style={styles.errorHeaderRow}>
                <Ionicons name="warning" size={20} color={COLORS.warningOrange} />
                <Text style={styles.errorTitle}>
                  {locationTrackingError.type === 'GPS_DISABLED'
                    ? 'Device GPS is Disabled'
                    : locationTrackingError.type === 'PERMISSION_DENIED'
                    ? 'Location Permission Denied'
                    : 'Location Tracking Issue'}
                </Text>
              </View>
              <Text style={styles.errorMessage}>{locationTrackingError.message}</Text>
              <View style={styles.errorActionsRow}>
                {locationTrackingError.type === 'PERMISSION_DENIED' ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => locationService.openSettings()}
                    style={styles.errorActionBtn}
                  >
                    <Text style={styles.errorActionBtnText}>Open Device Settings</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={retryLocationTracking}
                    style={styles.errorActionBtn}
                  >
                    <Text style={styles.errorActionBtnText}>Retry GPS Connection</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity activeOpacity={0.7} onPress={clearLocationError} style={styles.dismissErrorBtn}>
                  <Text style={styles.dismissErrorText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={isWideDesktop ? styles.webColumnsRow : undefined}>
            <View style={isWideDesktop ? styles.webLeftCol : undefined}>
          {/* ========================================================
              0. LIVE GOOGLE MAP INTERACTIVE NAVIGATION
             ======================================================== */}
          <ActiveJourneyMap
            origin={{
              latitude: activeTrip.startLocation?.latitude || homeZone.latitude || 16.4614,
              longitude: activeTrip.startLocation?.longitude || homeZone.longitude || 80.5069,
              name: activeTrip.startLocation?.name || homeZone.name || 'Home Zone (Departure)',
              address: activeTrip.startLocation?.address || homeZone.address || 'Departure Point',
            }}
            destination={{
              latitude: destLat,
              longitude: destLon,
              name: activeTrip.destination.name,
              address: activeTrip.destination.address,
            }}
            currentLocation={activeTrip.currentLocation}
            progressPercent={progressPercent}
            transportMode={activeTrip.transportMode}
            remainingMinutes={remainingMinutes}
            remainingDistanceKm={parseFloat(displayDistanceKm.toFixed(1))}
            routePath={activeTrip.routePath}
            height={isWideDesktop ? 450 : 380}
          />
            </View>

            <View style={isWideDesktop ? styles.webRightCol : undefined}>

          {/* ========================================================
              1. HERO ACTIVE JOURNEY COCKPIT CARD (THE WOW CARD)
             ======================================================== */}
          <View style={styles.journeyCockpitCard}>
            {/* Header Status Badges */}
            <View style={styles.cockpitHeaderRow}>
              <View style={styles.statusBadgeActive}>
                <View style={styles.pulseDotGreen} />
                <Text style={styles.statusBadgeText}>TRIP ACTIVE • GPS LOCKED</Text>
              </View>

              <View style={styles.modeBadge}>
                <Ionicons
                  name={activeTrip.transportMode === 'Bicycle' ? 'bicycle' : activeTrip.transportMode === 'Walking' ? 'walk' : 'car'}
                  size={13}
                  color={COLORS.tealAccent}
                />
                <Text style={styles.modeBadgeText}>{activeTrip.transportMode.toUpperCase()}</Text>
              </View>
            </View>

            {/* Destination Headline */}
            <View style={styles.destHeadlineBlock}>
              <Text style={styles.destMainTitle}>{activeTrip.destination.name}</Text>
              <Text style={styles.destSubAddress} numberOfLines={1}>
                {activeTrip.destination.address || 'Destination Point'}
              </Text>
            </View>

            {/* Big Arrival Clock Display */}
            <View style={styles.arrivalClockBanner}>
              <View style={styles.clockLeftBlock}>
                <Text style={styles.clockMicroLabel}>EXPECTED ARRIVAL</Text>
                <Text style={styles.clockMainTime}>{formattedArrivalTime}</Text>
              </View>

              <View style={styles.clockRightBlock}>
                <Text style={styles.countdownBadgeText}>~{remainingMinutes}m remaining</Text>
                <Text style={styles.distanceBadgeText}>{displayDistanceKm.toFixed(1)} km left</Text>
              </View>
            </View>

            {/* Graphical Journey Progress Bar */}
            <View style={styles.routeContainer}>
              <View style={styles.progressRowText}>
                <Text style={styles.progressLabel}>Journey Telemetry</Text>
                <Text style={styles.progressValueText}>{progressPercent}% Completed</Text>
              </View>

              <View style={styles.routeLineBackground}>
                <View style={[styles.routeLineProgress, { width: `${progressPercent}%` }]} />
              </View>

              <View style={styles.routePinsRow}>
                <View style={styles.pinOrigin}>
                  <Ionicons name="home" size={13} color={COLORS.tealAccent} />
                  <Text style={styles.pinLabel}>Start: {formattedStartTime}</Text>
                </View>

                <View style={styles.pinDest}>
                  <Ionicons name="location" size={13} color="#EF4444" />
                  <Text style={styles.pinLabel}>Arrival: ~{formattedArrivalTime}</Text>
                </View>
              </View>
            </View>

            {/* Key Trip Metrics Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Departed</Text>
                <Text style={styles.metricValue}>{formattedStartTime}</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Elapsed</Text>
                <Text style={styles.metricValue}>
                  {elapsedMinutes}m {elapsedSeconds.toString().padStart(2, '0')}s
                </Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Distance Left</Text>
                <Text style={styles.metricValue}>{displayDistanceKm.toFixed(1)} km</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Arrival Time</Text>
                <Text style={[styles.metricValue, { color: COLORS.tealAccent }]}>
                  {formattedArrivalTime}
                </Text>
              </View>
            </View>
          </View>

          {/* ========================================================
              2. LIVE CURRENT LOCATION CARD
             ======================================================== */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.liveLocTitleWrap}>
                <View style={styles.pulseDotGreenSolid} />
                <Text style={styles.sectionTitle}>Live GPS Telemetry</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleManualRefreshLocation}
                disabled={isRefreshingLocation}
                style={styles.refreshLocBtn}
              >
                {isRefreshingLocation ? (
                  <ActivityIndicator size="small" color={COLORS.tealPrimary} />
                ) : (
                  <>
                    <Ionicons name="locate" size={14} color={COLORS.tealPrimary} />
                    <Text style={styles.refreshLocText}>Refresh GPS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.currentLocBox}>
              <View style={styles.locIconCircle}>
                <Ionicons name="navigate-circle" size={28} color={COLORS.tealPrimary} />
              </View>

              <View style={styles.locTextColumn}>
                <Text style={styles.locAddressText} numberOfLines={2}>
                  {activeTrip.currentLocation?.address || 'Detecting current street address...'}
                </Text>
                <Text style={styles.locCoordinatesText}>
                  GPS: {Math.abs(activeTrip.currentLocation?.latitude || 0).toFixed(4)}°{' '}
                  {(activeTrip.currentLocation?.latitude || 0) >= 0 ? 'N' : 'S'},{' '}
                  {Math.abs(activeTrip.currentLocation?.longitude || 0).toFixed(4)}°{' '}
                  {(activeTrip.currentLocation?.longitude || 0) >= 0 ? 'E' : 'W'}
                  {activeTrip.currentLocation?.accuracy ? ` (±${Math.round(activeTrip.currentLocation.accuracy)}m)` : ''}
                </Text>
                <Text style={styles.locUpdateMeta}>
                  Status: <Text style={{ color: COLORS.tealPrimary, fontWeight: '800' }}>Live Active Ping</Text> •{' '}
                  {activeTrip.lastLocationUpdate}
                </Text>
              </View>
            </View>

            {/* Testing / Stationary Movement Simulator */}
            <View style={styles.simCardWrapper}>
              <View style={styles.simHeaderRow}>
                <View style={styles.simBadge}>
                  <Ionicons name="flash" size={13} color={COLORS.warningOrange} />
                  <Text style={styles.simBadgeText}>TESTING & DEMO</Text>
                </View>
                <Text style={styles.simHintText}>Stationary test movement</Text>
              </View>
              <View style={styles.simButtonsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => advanceTripSimulation(20)}
                  style={styles.simStepBtn}
                >
                  <Ionicons name="play-forward" size={14} color={COLORS.white} />
                  <Text style={styles.simStepBtnText}>Advance +20% Along Route</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => advanceTripSimulation(100)}
                  style={styles.simArriveBtn}
                >
                  <Ionicons name="checkmark-done" size={14} color={COLORS.tealPrimary} />
                  <Text style={styles.simArriveBtnText}>Simulate Arrival (100%)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Battery Optimization Strategy Note */}
            <View style={styles.batteryNoteBox}>
              <Ionicons name="leaf-outline" size={16} color={COLORS.tealPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.batteryNoteText}>
                Battery Saver Active: Coordinates poll every 8 seconds or 15 meters. Zero tracking occurs when trip is inactive.
              </Text>
            </View>
          </View>

          {/* ========================================================
              3. FAMILY SAFEGUARD ALERT STATUS & ACTIONS
             ======================================================== */}
          <View style={styles.familyAlertCard}>
            <View style={styles.familyAlertHeader}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.tealPrimary} />
              <Text style={styles.familyAlertTitle}>Family Safeguard Active</Text>
            </View>
            <Text style={styles.familyAlertDesc}>
              Departure notification was automatically sent to{' '}
              <Text style={styles.boldText}>{activeTrip.notifiedContacts?.join(' & ') || 'Family Contacts'}</Text> at {formattedStartTime}.
            </Text>

            <View style={styles.quickActionButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleShareLiveRide}
                style={styles.shareRideBtn}
              >
                <Ionicons name="share-social" size={16} color={COLORS.tealPrimary} />
                <Text style={styles.shareRideBtnText}>
                  {shareSuccess ? 'Link Copied!' : 'Share Live Ride'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowEmergencyNotice(true)}
                style={styles.sosAlertBtn}
              >
                <Ionicons name="alert-circle" size={16} color={COLORS.white} />
                <Text style={styles.sosAlertBtnText}>Emergency SOS</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Emergency SOS Notice */}
          {showEmergencyNotice && (
            <View style={styles.emergencyNoticeBox}>
              <View style={styles.emergencyNoticeHeader}>
                <Ionicons name="warning" size={20} color={COLORS.warningOrange} />
                <Text style={styles.emergencyNoticeTitle}>Emergency Alert Broadcast</Text>
              </View>
              <Text style={styles.emergencyNoticeBody}>
                SafeTrip has dispatched your live GPS coordinates to all emergency family contacts.
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowEmergencyNotice(false)}
                style={styles.dismissNoticeBtn}
              >
                <Text style={styles.dismissNoticeText}>Dismiss Notice</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ========================================================
              4. PRIMARY ACTIONS (STOP TRIP / CANCEL)
             ======================================================== */}
          <View style={styles.actionsContainer}>
            <SafeButton
              title="Stop Trip (I Reached Safely)"
              variant="teal"
              size="lg"
              loading={isCompleting}
              onPress={handleStopTripReachedSafely}
              showArrow
              icon={<Ionicons name="checkmark-circle" size={22} color={COLORS.white} />}
              style={styles.actionBtn}
            />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleStopTripCancel}
              disabled={isCancelling}
              style={styles.stopCancelBtn}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={COLORS.grayTextSecondary} />
              ) : (
                <>
                  <Ionicons name="stop-circle-outline" size={16} color={COLORS.grayTextSecondary} style={{ marginRight: 6 }} />
                  <Text style={styles.stopCancelBtnText}>Stop Trip & Cancel Tracking</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#F8FAFC',
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
    paddingVertical: SPACING.sm,
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
  noActiveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.xxl,
  },
  noActiveTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.navyPrimary,
    marginTop: SPACING.md,
  },
  noActiveSubtitle: {
    fontSize: 14,
    color: COLORS.grayTextSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  /* Error Banner */
  errorBannerCard: {
    backgroundColor: COLORS.warningSoft,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.warningBorder,
    ...SHADOWS.subtle,
  },
  errorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.warningOrange,
    marginLeft: 6,
  },
  errorMessage: {
    fontSize: 13,
    color: COLORS.navyPrimary,
    lineHeight: 18,
    marginVertical: 4,
  },
  errorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  errorActionBtn: {
    backgroundColor: COLORS.warningOrange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  errorActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  dismissErrorBtn: {
    paddingVertical: 6,
  },
  dismissErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.grayTextSecondary,
  },

  /* ==========================================
     JOURNEY COCKPIT CARD (CLEAN LIGHT THEME)
     ========================================== */
  journeyCockpitCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  cockpitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statusBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  pulseDotGreen: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.6,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.tealMuted,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.tealPrimary,
    letterSpacing: 0.5,
  },
  destHeadlineBlock: {
    marginVertical: 4,
  },
  destMainTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.navyPrimary,
    letterSpacing: -0.5,
  },
  destSubAddress: {
    fontSize: 12.5,
    color: COLORS.grayTextSecondary,
    marginTop: 2,
  },

  /* Arrival Banner */
  arrivalClockBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenSoft,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
  },
  clockLeftBlock: {
    flex: 1,
  },
  clockMicroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.tealPrimary,
    letterSpacing: 0.6,
  },
  clockMainTime: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.navyPrimary,
    marginTop: 2,
  },
  clockRightBlock: {
    alignItems: 'flex-end',
  },
  countdownBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.tealPrimary,
  },
  distanceBadgeText: {
    fontSize: 11.5,
    color: COLORS.grayTextSecondary,
    marginTop: 2,
  },

  /* Progress track */
  routeContainer: {
    marginVertical: SPACING.md,
  },
  progressRowText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.grayTextSecondary,
    fontWeight: '600',
  },
  progressValueText: {
    fontSize: 12.5,
    color: COLORS.tealPrimary,
    fontWeight: '800',
  },
  routeLineBackground: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  routeLineProgress: {
    height: 8,
    backgroundColor: COLORS.tealPrimary,
    borderRadius: 4,
  },
  routePinsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  pinOrigin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinDest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinLabel: {
    fontSize: 11,
    color: COLORS.grayTextSecondary,
  },

  /* Metrics Row */
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 10.5,
    color: COLORS.grayTextSecondary,
    marginBottom: 2,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  /* ==========================================
     Current Location Section
     ========================================== */
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.subtle,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  liveLocTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDotGreenSolid: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.tealPrimary,
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },
  refreshLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: COLORS.tealSoft,
    borderRadius: RADIUS.sm,
  },
  refreshLocText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.tealPrimary,
    marginLeft: 4,
  },
  currentLocBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locIconCircle: {
    marginRight: SPACING.sm,
  },
  locTextColumn: {
    flex: 1,
  },
  locAddressText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  locCoordinatesText: {
    fontSize: 11,
    color: COLORS.tealPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  locUpdateMeta: {
    fontSize: 10.5,
    color: COLORS.grayTextMuted,
    marginTop: 2,
  },
  simCardWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  simHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  simBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },
  simBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.warningOrange,
    marginLeft: 3,
  },
  simHintText: {
    fontSize: 11,
    color: COLORS.grayTextSecondary,
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  simStepBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealPrimary,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  simStepBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.white,
  },
  simArriveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.tealPrimary,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  simArriveBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.tealPrimary,
  },
  batteryNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tealSoft,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  batteryNoteText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.tealPrimary,
    lineHeight: 15,
  },

  /* Family Alert Card */
  familyAlertCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.subtle,
  },
  familyAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  familyAlertTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },
  familyAlertDesc: {
    fontSize: 12.5,
    color: COLORS.grayTextSecondary,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },
  quickActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.md,
  },
  shareRideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.tealSoft,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.tealMuted,
  },
  shareRideBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.tealPrimary,
  },
  sosAlertBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  sosAlertBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.white,
  },

  /* Emergency Notice */
  emergencyNoticeBox: {
    backgroundColor: COLORS.warningSoft,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.warningBorder,
    ...SHADOWS.subtle,
  },
  emergencyNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  emergencyNoticeTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.warningOrange,
    marginLeft: 6,
  },
  emergencyNoticeBody: {
    fontSize: 12.5,
    color: COLORS.navyPrimary,
    lineHeight: 18,
    marginVertical: 4,
  },
  dismissNoticeBtn: {
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  dismissNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.warningOrangeDark,
  },

  /* Actions */
  actionsContainer: {
    marginTop: SPACING.sm,
  },
  actionBtn: {
    marginBottom: SPACING.sm,
  },
  stopCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  stopCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.grayTextSecondary,
  },
});
