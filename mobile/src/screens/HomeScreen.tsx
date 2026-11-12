import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TripHistoryItem } from '../types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { useSafeRoute } from '../hooks/useSafeRouteState';
import { SafetyCard } from '../components/SafetyCard';
import { QuickActionButton } from '../components/QuickActionButton';
import { GeofenceAlertModal } from '../components/GeofenceAlertModal';
import { WebHeader } from '../components/WebHeader';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { getDestinationPhoto, IMAGES } from '../utils/imageAssets';

export const HomeScreen: React.FC = () => {
  const { isDesktopWeb, isWideDesktop } = useResponsiveLayout();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showAllTrips, setShowAllTrips] = useState(false);
  const [recordsTab, setRecordsTab] = useState<'ALL' | 'ACTIVE' | 'SUCCESS'>('ALL');
  const {
    user,
    homeZone,
    activeTrip,
    destinations,
    contacts,
    tripHistory,
    clearTripHistory,
    deleteTripRecord,
    isGeofenceAlertVisible,
    triggerGeofenceExitAlert,
    dismissGeofenceAlert,
    openAuthModal,
  } = useSafeRoute();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const currentActiveRecord: TripHistoryItem | null = activeTrip && activeTrip.status === 'ACTIVE'
    ? {
        id: activeTrip.id,
        destinationName: activeTrip.destination.name,
        destinationAddress: activeTrip.destination.address || `${activeTrip.destination.name}, Destination`,
        date: 'En route right now',
        durationMinutes: activeTrip.elapsedMinutes > 0 ? activeTrip.elapsedMinutes : 1,
        distanceKm: parseFloat((activeTrip.distanceRemainingKm || 4.2).toFixed(1)),
        status: 'ACTIVE',
        contactsNotifiedCount: activeTrip.notifiedContacts?.length || 1,
      }
    : null;

  const allRecords = useMemo(() => {
    // If activeTrip is active, ensure it is prominently listed at the top
    const historyWithoutActive = tripHistory.filter(
      (h) => h.status !== 'ACTIVE' && (currentActiveRecord ? h.id !== currentActiveRecord.id : true)
    );
    return currentActiveRecord ? [currentActiveRecord, ...historyWithoutActive] : tripHistory;
  }, [currentActiveRecord, tripHistory]);

  const activeCount = allRecords.filter((r) => r.status === 'ACTIVE').length;
  const successCount = allRecords.filter((r) => r.status === 'COMPLETED').length;

  const displayedRecords = useMemo(() => {
    let filtered = allRecords;
    if (recordsTab === 'ACTIVE') {
      filtered = allRecords.filter((r) => r.status === 'ACTIVE');
    } else if (recordsTab === 'SUCCESS') {
      filtered = allRecords.filter((r) => r.status === 'COMPLETED');
    }
    return showAllTrips || filtered.length <= 4 ? filtered : filtered.slice(0, 4);
  }, [allRecords, recordsTab, showAllTrips]);

  const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Traveler');

  const handleStartTripNavigation = (dest?: any) => {
    if (!user.email) {
      openAuthModal('login');
      return;
    }
    if (dest) {
      navigation.navigate('StartTrip', { preselectedDestination: dest });
    } else {
      navigation.navigate('StartTrip', {});
    }
  };
  const activeContactsCount = contacts ? contacts.length : 0;

  return (
    <View style={styles.container}>
      {/* Desktop Website Top Header (hidden on phones) */}
      <WebHeader activeRoute="HomeTab" />

      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktopWeb && styles.webScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.responsiveShell,
            isDesktopWeb && styles.webResponsiveShell,
          ]}
        >
          {/* Website Hero Greeting Bar OR Mobile Top App Header */}
          {isDesktopWeb ? (
            <View style={styles.webHeroCard}>
              <View style={{ flex: 1, minWidth: 280 }}>
                <View style={styles.webHeroBadgeRow}>
                  <View style={styles.headerShieldChip}>
                    <View style={styles.pulseDotGreen} />
                    <Text style={styles.headerShieldText}>
                      {homeZone.radiusMeters || 150}m Safe Zone Armed
                    </Text>
                  </View>
                  {user.email ? (
                    <View style={styles.emailPill}>
                      <Ionicons name="mail-outline" size={12} color={COLORS.tealPrimary} style={{ marginRight: 4 }} />
                      <Text style={styles.userEmailText} numberOfLines={1}>
                        {user.email}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.webHeroHeadline}>
                  {getGreeting()}, {displayName}
                </Text>
                <Text style={styles.webHeroSubtext}>
                  Monitor your home safety perimeter, calculate live transport ETAs, and keep family contacts updated automatically.
                </Text>
              </View>

              <View style={styles.webHeroActions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleStartTripNavigation()}
                  style={styles.webPrimaryBtn}
                >
                  <Ionicons name="navigate" size={16} color={COLORS.white} />
                  <Text style={styles.webPrimaryBtnText}>Start New Journey</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={triggerGeofenceExitAlert}
                  style={styles.webSecondaryWarnBtn}
                >
                  <Ionicons name="exit-outline" size={16} color={COLORS.warningOrange} />
                  <Text style={styles.simBtnText}>Simulate Exit</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.topHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={styles.headerBrandRow}>
                  <Image
                    source={IMAGES.logoShieldTransparent}
                    style={styles.headerMiniLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.headerBrandTitle}>SafeTrip</Text>
                  <View style={styles.headerShieldChip}>
                    <View style={styles.pulseDotGreen} />
                    <Text style={styles.headerShieldText}>{homeZone.radiusMeters || 150}m Armed</Text>
                  </View>
                </View>
                <Text style={styles.greetingText}>{getGreeting()},</Text>
                <Text style={styles.userNameText} numberOfLines={1}>
                  {displayName}
                </Text>
                {user.email ? (
                  <View style={styles.emailPill}>
                    <Ionicons name="mail-outline" size={12} color={COLORS.tealPrimary} style={{ marginRight: 4 }} />
                    <Text style={styles.userEmailText} numberOfLines={1}>
                      {user.email}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.headerRightRow}>
                {/* Quick Simulation Trigger Button */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={triggerGeofenceExitAlert}
                  style={styles.simTriggerBtn}
                >
                  <Ionicons name="exit-outline" size={16} color={COLORS.warningOrange} />
                  <Text style={styles.simBtnText}>Test Exit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => (navigation as any).navigate('SettingsTab')}
                  style={styles.profileBtn}
                  accessibilityLabel="View Profile"
                >
                  <Ionicons name="person" size={18} color={COLORS.tealPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Sign In Required Prompt if user is not signed in */}
          {!user.email && (
            <View style={[styles.guestBanner, isDesktopWeb && { marginHorizontal: 0 }]}>
              <View style={styles.guestBannerIcon}>
                <Image
                  source={IMAGES.logoShieldTransparent}
                  style={{ width: 22, height: 22 }}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.guestBannerTitle}>Sign In Required</Text>
                <Text style={styles.guestBannerSubtitle}>
                  Sign in to sync your automated family departure alerts, arrival clocks, and emergency contacts.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openAuthModal('login')}
                style={styles.guestBannerBtn}
              >
                <Text style={styles.guestBannerBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Main Dashboard Columns (2-column on Wide Desktop Web, stacked on Phone) */}
          <View style={isWideDesktop ? styles.webColumnsRow : undefined}>
            <View style={isWideDesktop ? styles.webLeftCol : undefined}>
              {/* Current Safety Status Banner */}
              <SafetyCard
                homeZone={homeZone}
                activeTrip={activeTrip}
                onPressHomeZone={() => navigation.navigate('SetHomeLocation')}
                onPressActiveTrip={() => navigation.navigate('ActiveTrip')}
                containerStyle={isDesktopWeb ? { marginHorizontal: 0, marginTop: 0 } : undefined}
              />

              {/* Fast One-Tap Commute Search Bar (mobile view primary launcher) */}
              {!isDesktopWeb && (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => handleStartTripNavigation()}
                  style={styles.quickStartBar}
                >
                  <View style={styles.quickStartIconCircle}>
                    <Ionicons name="navigate-outline" size={20} color={COLORS.tealPrimary} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.quickStartTitle}>Start a New Journey</Text>
                    <Text style={styles.quickStartSubtitle}>Auto-computes travel ETA & alerts family</Text>
                  </View>
                  <View style={styles.quickStartArrowPill}>
                    <Text style={styles.quickStartArrowText}>Go</Text>
                    <Ionicons name="arrow-forward" size={12} color={COLORS.white} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Core Quick Actions Bounded Card Box (2x2 Symmetrical Grid) */}
              <View style={[styles.quickActionsCard, isDesktopWeb && { marginHorizontal: 0 }]}>
                <View style={styles.quickActionsCardHeader}>
                  <Text style={styles.sectionTitle}>Quick Actions</Text>
                  <View style={styles.quickActionsCountPill}>
                    <Text style={styles.quickActionsCountText}>4 shortcuts</Text>
                  </View>
                </View>

                <View style={styles.quickActionsGrid}>
                  <View style={styles.quickActionsRow}>
                    <QuickActionButton
                      title="Start Trip"
                      subtitle="Pick place & notify"
                      iconName="paper-plane"
                      colorVariant="teal"
                      onPress={() => handleStartTripNavigation()}
                    />
                    <QuickActionButton
                      title="Destinations"
                      subtitle="Campus, Work, Gym"
                      iconName="location"
                      colorVariant="blue"
                      onPress={() => navigation.navigate('Destinations')}
                    />
                  </View>

                  <View style={styles.quickActionsRow}>
                    <QuickActionButton
                      title="Family"
                      subtitle="Contacts & alerts"
                      iconName="people"
                      colorVariant="navy"
                      onPress={() => (navigation as any).navigate('ContactsTab')}
                    />
                    <QuickActionButton
                      title="Settings"
                      subtitle="Geofence & alarms"
                      iconName="settings"
                      colorVariant="orange"
                      onPress={() => (navigation as any).navigate('SettingsTab')}
                    />
                  </View>
                </View>
              </View>

        {/* Frequent Places Section with Real Photos */}
        {destinations && destinations.length > 0 && (
          <>
            <View style={[styles.sectionHeader, isDesktopWeb && styles.webSectionHeader]}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Frequent Places</Text>
                <View style={styles.destCountBadge}>
                  <Text style={styles.destCountBadgeText}>{destinations.length} saved</Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Destinations')}
                style={styles.viewAllDestBtn}
              >
                <Text style={styles.viewAllDestText}>View All</Text>
                <Ionicons name="chevron-forward" size={13} color={COLORS.tealPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.frequentPlacesScroll, isDesktopWeb && { paddingHorizontal: 0 }]}
            >
              {destinations.slice(0, 4).map((dest) => {
                const photo = getDestinationPhoto(dest.name);
                return (
                  <TouchableOpacity
                    key={dest.id}
                    activeOpacity={0.85}
                    onPress={() => handleStartTripNavigation(dest)}
                    style={styles.frequentCard}
                  >
                    <View style={styles.frequentImageWrap}>
                      <Image source={photo} style={styles.frequentImage} resizeMode="cover" />
                      <View style={styles.frequentCategoryPill}>
                        <Text style={styles.frequentCategoryText}>{dest.category.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={styles.frequentBody}>
                      <Text style={styles.frequentName} numberOfLines={1}>
                        {dest.name}
                      </Text>
                      <Text style={styles.frequentAddr} numberOfLines={1}>
                        {dest.address}
                      </Text>
                      <View style={styles.frequentMetaRow}>
                        <View style={styles.frequentMetaItem}>
                          <Ionicons name="time-outline" size={12} color={COLORS.grayTextSecondary} />
                          <Text style={styles.frequentMetaText}>{dest.estimatedMinutes}m</Text>
                        </View>
                        <Text style={styles.frequentBullet}>•</Text>
                        <View style={styles.frequentMetaItem}>
                          <Ionicons name="navigate-outline" size={12} color={COLORS.grayTextSecondary} />
                          <Text style={styles.frequentMetaText}>{dest.distanceKm}km</Text>
                        </View>
                        <View style={styles.frequentGoPill}>
                          <Text style={styles.frequentGoText}>Go</Text>
                          <View style={styles.frequentGoArrowBadge}>
                            <Ionicons name="arrow-forward" size={9} color="#FFFFFF" />
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Website Sidebar Stats Summary (Desktop Only) */}
        {isDesktopWeb && (
          <View style={styles.webSummaryStrip}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => (navigation as any).navigate('ContactsTab')}
              style={styles.webMiniStatCard}
            >
              <View style={[styles.webMiniIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="people" size={18} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.webMiniLabel}>Family Circle</Text>
                <Text style={styles.webMiniVal}>{activeContactsCount} Contacts Protected</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('SetHomeLocation')}
              style={styles.webMiniStatCard}
            >
              <View style={[styles.webMiniIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="shield-checkmark" size={18} color="#10B981" />
              </View>
              <View>
                <Text style={styles.webMiniLabel}>Geofence Zone</Text>
                <Text style={styles.webMiniVal}>{homeZone.radiusMeters || 150}m Active Perimeter</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
            </View>

            <View style={isWideDesktop ? styles.webRightCol : undefined}>
        {/* Today's Trips Section */}
        <View style={[styles.sectionHeader, isDesktopWeb && styles.webSectionHeader]}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Journey Records</Text>
            <View style={styles.recordBadge}>
              <Text style={styles.recordBadgeText}>{allRecords.length} total</Text>
            </View>
          </View>
          {tripHistory.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={clearTripHistory}
              style={styles.clearBtn}
            >
              <Ionicons name="trash-outline" size={13} color={COLORS.grayTextSecondary} />
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Records Filter Tabs: All, Active, Success */}
        <View style={[styles.recordsTabRow, isDesktopWeb && { paddingHorizontal: 0 }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setRecordsTab('ALL')}
            style={[styles.recordTabBtn, recordsTab === 'ALL' && styles.recordTabBtnActive]}
          >
            <Text style={[styles.recordTabText, recordsTab === 'ALL' && styles.recordTabTextActive]}>
              All ({allRecords.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setRecordsTab('ACTIVE')}
            style={[styles.recordTabBtn, recordsTab === 'ACTIVE' && styles.recordTabBtnActive]}
          >
            <View style={styles.tabBadgeRow}>
              {activeCount > 0 && <View style={styles.pulseDotGreen} />}
              <Text style={[styles.recordTabText, recordsTab === 'ACTIVE' && styles.recordTabTextActive]}>
                Active ({activeCount})
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setRecordsTab('SUCCESS')}
            style={[styles.recordTabBtn, recordsTab === 'SUCCESS' && styles.recordTabBtnActive]}
          >
            <Text style={[styles.recordTabText, recordsTab === 'SUCCESS' && styles.recordTabTextActive]}>
              Success ({successCount})
            </Text>
          </TouchableOpacity>
        </View>

        {displayedRecords.length > 0 ? (
          <View style={[styles.historyContainer, isDesktopWeb && { paddingHorizontal: 0 }]}>
            {displayedRecords.map((item) => {
              const isActive = item.status === 'ACTIVE';
              const isSuccess = item.status === 'COMPLETED';

              return (
                <View
                  key={item.id}
                  style={[styles.historyCard, isActive && styles.historyCardActive]}
                >
                  <View
                    style={[
                      styles.historyIconCircle,
                      isActive && styles.historyIconCircleActive,
                      !isActive && !isSuccess && styles.historyIconCircleCancelled,
                    ]}
                  >
                    <Ionicons
                      name={
                        isActive
                          ? 'navigate'
                          : isSuccess
                          ? 'checkmark-circle'
                          : 'close-circle'
                      }
                      size={20}
                      color={
                        isActive
                          ? COLORS.tealPrimary
                          : isSuccess
                          ? '#10B981'
                          : COLORS.grayTextMuted
                      }
                    />
                  </View>

                  <View style={styles.historyDetails}>
                    <Text style={styles.historyDestination}>{item.destinationName}</Text>
                    <Text style={styles.historyAddress} numberOfLines={1}>
                      {item.destinationAddress}
                    </Text>
                    <Text style={styles.historyMeta}>
                      {isActive
                        ? `En route • ${item.durationMinutes}m elapsed • ${item.distanceKm} km left • Active Ping`
                        : isSuccess
                        ? `${item.date} • ${item.durationMinutes} mins • ${item.distanceKm} km • Safe Arrival`
                        : `${item.date} • Journey cancelled`}
                    </Text>
                  </View>

                  <View style={styles.cardRightCol}>
                    {isActive ? (
                      <View style={styles.statusActivePill}>
                        <View style={styles.pulseDotGreen} />
                        <Text style={styles.statusActiveText}>ACTIVE</Text>
                      </View>
                    ) : isSuccess ? (
                      <View style={styles.statusSuccessPill}>
                        <Text style={styles.statusSuccessText}>SUCCESS</Text>
                      </View>
                    ) : (
                      <View style={styles.statusCancelledPill}>
                        <Text style={styles.statusCancelledText}>CANCELLED</Text>
                      </View>
                    )}

                    {isActive ? (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('ActiveTrip')}
                        style={styles.trackLiveBtn}
                      >
                        <Text style={styles.trackLiveBtnText}>Track</Text>
                        <View style={styles.trackLiveArrowCircle}>
                          <Ionicons name="arrow-forward" size={10} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.6}
                        onPress={() => deleteTripRecord(item.id)}
                        style={styles.deleteSingleBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle-outline" size={16} color={COLORS.grayTextMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {allRecords.length > 4 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowAllTrips((prev) => !prev)}
                style={styles.toggleAllBtn}
              >
                <Text style={styles.toggleAllBtnText}>
                  {showAllTrips ? 'Show Less' : `View All (${allRecords.length}) Records`}
                </Text>
                <Ionicons
                  name={showAllTrips ? 'chevron-up' : 'chevron-down'}
                  size={15}
                  color={COLORS.tealPrimary}
                />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.emptyCard, isDesktopWeb && { marginHorizontal: 0 }]}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name={
                  recordsTab === 'ACTIVE'
                    ? 'navigate-circle-outline'
                    : recordsTab === 'SUCCESS'
                    ? 'checkmark-done-circle-outline'
                    : 'shield-checkmark-outline'
                }
                size={28}
                color={COLORS.tealPrimary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {recordsTab === 'ACTIVE'
                ? 'No Active Journeys'
                : recordsTab === 'SUCCESS'
                ? 'No Completed Journeys Yet'
                : 'No Trips Recorded Yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {recordsTab === 'ACTIVE'
                ? 'You have no trips currently running. Start a journey from departure to begin live tracking.'
                : recordsTab === 'SUCCESS'
                ? 'Trips will be safely logged with duration and arrival confirmations once completed.'
                : 'When you step out of your Home Zone or take a journey, SafeTrip will log departure time, duration, and safety status here.'}
            </Text>
            {recordsTab !== 'SUCCESS' && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleStartTripNavigation()}
                style={styles.emptyActionBtn}
              >
                <Ionicons name="navigate-outline" size={15} color={COLORS.white} />
                <Text style={styles.emptyActionBtnText}>Start a Journey</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Geofence Simulator Callout for Evaluators/Users */}
        <View style={[styles.simulatorBanner, isDesktopWeb && { marginHorizontal: 0 }]}>
          <View style={styles.simBadge}>
            <Ionicons name="flash" size={14} color={COLORS.warningOrange} />
            <Text style={styles.simBadgeText}>MVP GEOFENCE DEMO</Text>
          </View>
          <Text style={styles.simTitle}>Simulate Leaving Home Zone</Text>
          <Text style={styles.simDesc}>
            Tap below to simulate stepping outside your {homeZone.radiusMeters || 150}m home boundary to test the instant family departure reminder.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={triggerGeofenceExitAlert}
            style={styles.simActionBtn}
          >
            <Ionicons name="exit" size={16} color={COLORS.white} />
            <Text style={styles.simActionBtnText}>Trigger Geofence Exit Alert</Text>
          </TouchableOpacity>
        </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Geofence Exit Alarm Modal (The Core Problem Solver) */}
      <GeofenceAlertModal
        visible={isGeofenceAlertVisible}
        onConfirmTrip={() => {
          dismissGeofenceAlert();
          handleStartTripNavigation();
        }}
        onDismiss={dismissGeofenceAlert}
        onCustomDestination={() => {
          dismissGeofenceAlert();
          handleStartTripNavigation();
        }}
      />
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
    paddingBottom: SPACING.xxl,
    width: '100%',
  },
  webScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 110,
  },
  webHeroCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    ...SHADOWS.subtle,
  },
  webHeroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  webHeroHeadline: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.navyPrimary,
    letterSpacing: -0.6,
  },
  webHeroSubtext: {
    fontSize: 13.5,
    color: COLORS.grayTextSecondary,
    marginTop: 4,
    lineHeight: 20,
    maxWidth: 600,
  },
  webHeroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  webPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.tealPrimary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: RADIUS.full,
    ...SHADOWS.glowTeal,
  },
  webPrimaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.white,
  },
  webSecondaryWarnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningSoft,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },
  webColumnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },
  webLeftCol: {
    flex: 1.45,
    minWidth: 0,
  },
  webRightCol: {
    flex: 1,
    minWidth: 0,
  },
  webSectionHeader: {
    paddingHorizontal: 0,
  },
  webSectionInner: {
    paddingHorizontal: 0,
  },
  webSummaryStrip: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  webMiniStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.subtle,
  },
  webMiniIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMiniLabel: {
    fontSize: 11.5,
    color: COLORS.grayTextSecondary,
    fontWeight: '600',
  },
  webMiniVal: {
    fontSize: 13.5,
    color: COLORS.navyPrimary,
    fontWeight: '800',
    marginTop: 2,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  headerMiniLogo: {
    width: 22,
    height: 22,
  },
  headerBrandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.navyPrimary,
    letterSpacing: -0.3,
  },
  headerShieldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginLeft: 4,
  },
  headerShieldText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46',
  },
  quickStartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...SHADOWS.subtle,
  },
  quickStartIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  quickStartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },
  quickStartSubtitle: {
    fontSize: 11.5,
    color: COLORS.grayTextSecondary,
    marginTop: 2,
  },
  quickStartArrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.tealPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  quickStartArrowText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  greetingText: {
    fontSize: 14,
    color: COLORS.grayTextSecondary,
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.navyPrimary,
    letterSpacing: -0.5,
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.tealMuted,
  },
  userEmailText: {
    fontSize: 11.5,
    color: COLORS.tealPrimary,
    fontWeight: '600',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningSoft,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },
  simBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warningOrange,
    marginLeft: 4,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    ...SHADOWS.subtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.grayTextSecondary,
  },
  quickActionsCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  quickActionsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionsCountPill: {
    backgroundColor: COLORS.brandGreenSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
  },
  quickActionsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandGreenDark,
  },
  quickActionsGrid: {
    gap: 10,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  historyContainer: {
    paddingHorizontal: SPACING.md,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    ...SHADOWS.subtle,
  },
  historyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  historyDetails: {
    flex: 1,
  },
  historyDestination: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  historyAddress: {
    fontSize: 12,
    color: COLORS.grayTextSecondary,
    marginTop: 1,
  },
  historyMeta: {
    fontSize: 11,
    color: COLORS.grayTextMuted,
    marginTop: 3,
  },
  /* Records Filter Tabs */
  recordsTabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  recordTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recordTabBtnActive: {
    backgroundColor: COLORS.tealSoft,
    borderColor: COLORS.tealPrimary,
  },
  recordTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.grayTextSecondary,
  },
  recordTabTextActive: {
    color: COLORS.tealPrimary,
    fontWeight: '800',
  },
  tabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pulseDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  historyCardActive: {
    borderColor: COLORS.tealPrimary,
    borderWidth: 1.5,
    backgroundColor: '#F0FDF4',
  },
  historyIconCircleActive: {
    backgroundColor: COLORS.tealSoft,
    borderWidth: 1,
    borderColor: COLORS.tealPrimary,
  },
  historyIconCircleCancelled: {
    backgroundColor: '#F1F5F9',
  },
  statusActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.tealPrimary,
  },
  statusActiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.tealPrimary,
    letterSpacing: 0.4,
  },
  statusSuccessPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  statusSuccessText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  statusCancelledPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  statusCancelledText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.grayTextMuted,
    letterSpacing: 0.3,
  },
  trackLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.tealPrimary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    marginTop: 4,
    ...SHADOWS.glowTeal,
  },
  trackLiveBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
  trackLiveArrowCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSafePill: {
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.tealMuted,
  },
  statusSafeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.tealPrimary,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navyPrimary,
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: COLORS.grayTextSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 420,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealPrimary,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    marginTop: 14,
    ...SHADOWS.subtle,
  },
  emptyActionBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordBadge: {
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  recordBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tealPrimary,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  clearBtnText: {
    fontSize: 12,
    color: COLORS.grayTextSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  cardRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: 8,
    height: 48,
  },
  deleteSingleBtn: {
    marginTop: 6,
    padding: 2,
  },
  toggleAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.tealSoft,
  },
  toggleAllBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.tealPrimary,
    marginRight: 4,
  },
  simulatorBanner: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.warningBorder,
    ...SHADOWS.subtle,
  },
  simBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.warningSoft,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
    marginBottom: 6,
  },
  simBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.warningOrange,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  simTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  simDesc: {
    fontSize: 12.5,
    color: COLORS.grayTextSecondary,
    marginVertical: 6,
    lineHeight: 18,
  },
  simActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.warningOrange,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    marginTop: 4,
    ...SHADOWS.glowOrange,
  },
  simActionBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF8E8',
    borderWidth: 1.5,
    borderColor: '#C2EFC0',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.subtle,
  },
  guestBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#C2EFC0',
  },
  guestBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },
  guestBannerSubtitle: {
    fontSize: 11.5,
    color: COLORS.grayTextSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  guestBannerBtn: {
    backgroundColor: COLORS.tealPrimary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    ...SHADOWS.subtle,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  guestBannerBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  destCountBadge: {
    backgroundColor: '#EAF8E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#C2EFC0',
  },
  destCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  viewAllDestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewAllDestText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.tealPrimary,
    marginRight: 2,
  },
  frequentPlacesScroll: {
    paddingBottom: SPACING.md,
    gap: 12,
  },
  frequentCard: {
    width: 220,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E8F0EA',
    ...SHADOWS.subtle,
  },
  frequentImageWrap: {
    width: '100%',
    height: 100,
    position: 'relative',
    backgroundColor: '#EAF8E8',
  },
  frequentImage: {
    width: '100%',
    height: '100%',
  },
  frequentCategoryPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  frequentCategoryText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  frequentBody: {
    padding: 10,
  },
  frequentName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.navyPrimary,
    marginBottom: 2,
  },
  frequentAddr: {
    fontSize: 11,
    color: COLORS.grayTextSecondary,
    marginBottom: 8,
  },
  frequentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frequentMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  frequentMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.grayTextSecondary,
  },
  frequentBullet: {
    marginHorizontal: 5,
    color: COLORS.grayTextMuted,
    fontSize: 10,
  },
  frequentGoPill: {
    marginLeft: 'auto',
    backgroundColor: '#EAF8E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#C2EFC0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  frequentGoText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2E7D32',
  },
  frequentGoArrowBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#369E33',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
