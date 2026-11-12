import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Destination, LocationPoint, RootStackParamList } from '../types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { useSafeRoute } from '../hooks/useSafeRouteState';
import { ScreenHeader } from '../components/ScreenHeader';
import { SafeButton } from '../components/SafeButton';
import { ActiveJourneyMap } from '../components/ActiveJourneyMap';
import { WebHeader } from '../components/WebHeader';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { locationService } from '../services/locationService';
import { destinationService, RouteEstimatesMap } from '../services/destinationService';
import { IMAGES } from '../utils/imageAssets';

type Props = NativeStackScreenProps<RootStackParamList, 'StartTrip'>;

export interface TransportModeOption {
  id: 'Car' | 'Bicycle' | 'Transit' | 'Walking';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  speedKmH: number;
  themeColor: string;
  bgTint: string;
  sublabel: string;
}

const TRANSPORT_MODES: TransportModeOption[] = [
  {
    id: 'Car',
    label: 'Car / Cab',
    icon: 'car-sport',
    speedKmH: 38,
    themeColor: '#2563EB',
    bgTint: '#EFF6FF',
    sublabel: '~38 km/h',
  },
  {
    id: 'Bicycle',
    label: 'Two-Wheeler',
    icon: 'bicycle',
    speedKmH: 32,
    themeColor: '#10B981',
    bgTint: '#ECFDF5',
    sublabel: '~32 km/h',
  },
  {
    id: 'Transit',
    label: 'Metro / Bus',
    icon: 'bus',
    speedKmH: 26,
    themeColor: '#6366F1',
    bgTint: '#EEF2FF',
    sublabel: '~26 km/h',
  },
  {
    id: 'Walking',
    label: 'Walking',
    icon: 'walk',
    speedKmH: 4.8,
    themeColor: '#369E33',
    bgTint: '#EAF8E8',
    sublabel: '~4.8 km/h',
  },
];

export const StartTripScreen: React.FC<Props> = ({ route, navigation }) => {
  const { isDesktopWeb, isWideDesktop } = useResponsiveLayout();
  const { user, homeZone, destinations, startTrip, openAuthModal } = useSafeRoute();
  const preselected = route.params?.preselectedDestination;

  // 1. Current Start Location state
  const [startLocation, setStartLocation] = useState<LocationPoint>({
    name: homeZone.name || 'Mangalagiri',
    address: homeZone.address || 'N10, Mangalagiri, Andhra Pradesh',
    latitude: homeZone.latitude || 16.4613,
    longitude: homeZone.longitude || 80.5069,
  });
  const [isDetectingStartGPS, setIsDetectingStartGPS] = useState(false);

  // 2. Destination state
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(
    preselected || (destinations.length > 0 ? destinations[0] : null)
  );
  const [customDestName, setCustomDestName] = useState(
    preselected ? preselected.name : ''
  );
  const [isCustomDest, setIsCustomDest] = useState(!preselected);
  const [searchResults, setSearchResults] = useState<
    Array<{
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      distanceKm: number;
      estimatedMinutes: number;
      arrivalTime?: string;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  // Geocoding state
  const [geocodedDest, setGeocodedDest] = useState<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
    estimatedMinutes: number;
    arrivalTime: string;
  } | null>(preselected ? {
    name: preselected.name,
    address: preselected.address,
    latitude: preselected.latitude || 16.5062,
    longitude: preselected.longitude || 80.648,
    distanceKm: preselected.distanceKm || 5.0,
    estimatedMinutes: preselected.estimatedMinutes || 20,
    arrivalTime: '',
  } : null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // 3. Transport Mode & Real-Road Route Telemetry
  const [transportMode, setTransportMode] = useState<'Transit' | 'Car' | 'Walking' | 'Bicycle'>('Car');
  const [routeEstimates, setRouteEstimates] = useState<RouteEstimatesMap | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Prevent search dropdown re-opening or geocoding overwrite right after selecting a suggestion
  const suppressSearchRef = useRef(false);

  // Prompt sign-in if guest user enters StartTrip
  useEffect(() => {
    if (!user.email) {
      openAuthModal('login');
    }
  }, [user.email, openAuthModal]);

  // Auto-detect current GPS location immediately on mount
  useEffect(() => {
    handleDetectCurrentStartGPS();
  }, []);

  // Real-time live place search autocomplete against backend / Nominatim
  useEffect(() => {
    if (suppressSearchRef.current) return;
    if (!isCustomDest || !customDestName.trim() || customDestName.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const places = await destinationService.searchPlaces(
          customDestName.trim(),
          startLocation.latitude,
          startLocation.longitude,
          transportMode
        );
        if (!cancelled && !suppressSearchRef.current) {
          setSearchResults(places);
        }
      } catch (err) {
        console.warn('Place search error:', err);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customDestName, isCustomDest, startLocation.latitude, startLocation.longitude]);

  // Debounced geocoding query when user finishes typing a place manually without clicking a suggestion
  useEffect(() => {
    if (suppressSearchRef.current) return;
    if (!isCustomDest || !customDestName.trim() || customDestName.trim().length < 2) {
      setGeocodedDest(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsGeocoding(true);
      try {
        const res = await destinationService.geocodeQuery(
          customDestName.trim(),
          startLocation.latitude,
          startLocation.longitude,
          transportMode
        );
        if (!cancelled && !suppressSearchRef.current) {
          setGeocodedDest(res);
        }
      } catch (err) {
        console.warn('Geocoding query error:', err);
      } finally {
        if (!cancelled) setIsGeocoding(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customDestName, isCustomDest, startLocation.latitude, startLocation.longitude]);

  /**
   * Refresh current start location with live GPS
   */
  const handleDetectCurrentStartGPS = async () => {
    setIsDetectingStartGPS(true);
    try {
      const coords = await locationService.getCurrentLocation();
      const placeName = coords.address && !coords.address.includes('°')
        ? coords.address.split(',')[0].trim()
        : 'Current GPS Location';

      setStartLocation({
        name: placeName || 'Current GPS Location',
        address: coords.address || `${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}°`,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } catch (e) {
      console.warn('GPS start location detection fallback:', e);
      setStartLocation({
        name: homeZone.name || 'Mangalagiri',
        address: homeZone.address || 'Mangalagiri, Andhra Pradesh',
        latitude: homeZone.latitude || 16.4613,
        longitude: homeZone.longitude || 80.5069,
      });
    } finally {
      setIsDetectingStartGPS(false);
    }
  };

  // Check if destination coordinates are genuinely resolved
  const hasDestinationSelected = Boolean(
    (!isCustomDest && selectedDestination) ||
    (isCustomDest && geocodedDest)
  );

  // Active destination details
  const activeDestName = hasDestinationSelected
    ? (isCustomDest ? (geocodedDest?.name || customDestName.trim() || 'Custom Destination') : (selectedDestination?.name || 'Selected Place'))
    : isCustomDest && customDestName.trim().length > 1
    ? customDestName.trim()
    : 'Select Destination';

  const activeDestAddress = hasDestinationSelected
    ? (isCustomDest
        ? (geocodedDest?.address || 'Selected destination')
        : (selectedDestination?.address || 'Saved destination'))
    : isCustomDest && (isSearching || isGeocoding)
    ? 'Searching exact road coordinates...'
    : 'Tap above to search or pick a destination';

  const activeDestLat = hasDestinationSelected
    ? (isCustomDest ? (geocodedDest?.latitude ?? startLocation.latitude) : (selectedDestination?.latitude ?? 16.5062))
    : startLocation.latitude;

  const activeDestLon = hasDestinationSelected
    ? (isCustomDest ? (geocodedDest?.longitude ?? startLocation.longitude) : (selectedDestination?.longitude ?? 80.648))
    : startLocation.longitude;

  // Fetch exact real-road distance, exact durations & road polyline via OSRM whenever origin or destination coords change
  useEffect(() => {
    if (!hasDestinationSelected) {
      setRouteEstimates(null);
      setIsCalculatingRoute(false);
      return;
    }

    let cancelled = false;
    setIsCalculatingRoute(true);
    destinationService
      .getRouteEstimates(startLocation.latitude, startLocation.longitude, activeDestLat, activeDestLon)
      .then((estimates) => {
        if (!cancelled) {
          setRouteEstimates(estimates);
        }
      })
      .catch(() => {
        // Fallback computation below handles offline smoothly
      })
      .finally(() => {
        if (!cancelled) {
          setIsCalculatingRoute(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasDestinationSelected, startLocation.latitude, startLocation.longitude, activeDestLat, activeDestLon]);

  // Fallback road-adjusted distance (~1.26x Haversine) until live OSRM road response lands
  const fallbackRoadKm = useMemo(() => {
    if (!hasDestinationSelected) return 0;
    const straight = locationService.calculateDistanceKm(
      startLocation.latitude,
      startLocation.longitude,
      activeDestLat,
      activeDestLon
    );
    return Math.max(Number((straight * 1.26).toFixed(1)), 0.2);
  }, [hasDestinationSelected, startLocation.latitude, startLocation.longitude, activeDestLat, activeDestLon]);

  const getModeEstimate = (mode: TransportModeOption) => {
    if (!hasDestinationSelected) {
      return {
        distanceKm: 0,
        minutes: 0,
        speedKmH: mode.speedKmH,
        isExactRoad: false,
        geometry: [] as [number, number][],
      };
    }
    const live = routeEstimates?.[mode.id];
    if (live) {
      return live;
    }
    const fallbackDist =
      mode.id === 'Transit' ? Math.max(Number((fallbackRoadKm * 1.05).toFixed(1)), 0.2) : fallbackRoadKm;
    const mins = Math.max(Math.round((fallbackDist / mode.speedKmH) * 60), 1);
    return {
      distanceKm: fallbackDist,
      minutes: mins,
      speedKmH: mode.speedKmH,
      isExactRoad: false,
      geometry: [] as [number, number][],
    };
  };

  const selectedMode = TRANSPORT_MODES.find((m) => m.id === transportMode) || TRANSPORT_MODES[0];
  const selectedEstimate = getModeEstimate(selectedMode);
  const activeDistanceKm = selectedEstimate.distanceKm;
  const calculatedMinutes = selectedEstimate.minutes;
  const activeSpeedKmH = selectedEstimate.speedKmH;
  const activeRoutePath = selectedEstimate.geometry;

  const arrivalDate = useMemo(() => {
    if (!hasDestinationSelected || calculatedMinutes <= 0) return null;
    return new Date(Date.now() + calculatedMinutes * 60 * 1000);
  }, [hasDestinationSelected, calculatedMinutes]);

  const formattedArrivalTime = arrivalDate
    ? arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const getModeDuration = (mode: TransportModeOption) => {
    if (!hasDestinationSelected) {
      return '-- min';
    }
    const mins = getModeEstimate(mode).minutes;
    if (mins <= 0) return '-- min';
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins} min`;
  };

  /**
   * Confirm and start trip with accurate coordinates, real road distance, route path, and arrival time
   */
  const handleConfirmStartTrip = async () => {
    if (!user.email) {
      // User is not signed in -> open in-place Auth Box
      openAuthModal('login');
      return;
    }

    if (!hasDestinationSelected) {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('Please search for or select a destination before starting.');
      } else {
        Alert.alert('Destination Required', 'Please search for or select a destination before starting.');
      }
      return;
    }

    setIsStarting(true);

    const finalDestination: Destination | LocationPoint = {
      name: activeDestName,
      address: activeDestAddress,
      latitude: activeDestLat,
      longitude: activeDestLon,
      distanceKm: activeDistanceKm,
      estimatedMinutes: calculatedMinutes,
      routePath: activeRoutePath,
    };

    await startTrip(finalDestination as any, transportMode, startLocation);

    setIsStarting(false);
    navigation.replace('ActiveTrip');
  };

  return (
    <View style={styles.container}>
      <WebHeader
        activeRoute="StartTrip"
        title="Plan Your Journey"
        subtitle="Real-time route distance, transport speed ETA & automated family protection"
      />

      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={[styles.scrollContent, isDesktopWeb && styles.webScrollContent]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        {...(Platform.OS === 'web' ? ({ 'data-scroll-container': 'true' } as any) : {})}
      >
        <View style={[styles.responsiveShell, isDesktopWeb && styles.webResponsiveShell]}>
          {!isDesktopWeb && (
            <ScreenHeader
              title="Start Journey"
              subtitle="Real-time route, arrival time & family protection"
              showBack
              onBack={() => navigation.goBack()}
            />
          )}

          {/* Sign In Required Notice Banner if user is not signed in */}
          {!user.email && (
            <View style={styles.authNoticeBanner}>
              <View style={styles.authNoticeIcon}>
                <Image
                  source={IMAGES.logoShieldTransparent}
                  style={{ width: 22, height: 22 }}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.authNoticeTitle}>Sign In Required to Start Journey</Text>
                <Text style={styles.authNoticeSubtitle}>
                  Please sign in to arm automated family departure alerts and live tracking.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openAuthModal('login')}
                style={styles.authNoticeBtn}
              >
                <Text style={styles.authNoticeBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={isWideDesktop ? styles.webColumnsRow : undefined}>
            <View style={isWideDesktop ? styles.webLeftCol : undefined}>

          {/* ========================================================
              1. STARTING LOCATION CARD (WITH RADAR GLOW)
             ======================================================== */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithBadge}>
                <Text style={styles.sectionTitle}>1. Departure Location</Text>
                <View style={styles.liveOriginBadge}>
                  <View style={styles.pulseDotGreen} />
                  <Text style={styles.liveOriginText}>GPS VERIFIED</Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleDetectCurrentStartGPS}
                disabled={isDetectingStartGPS}
                style={styles.refreshLocBtn}
              >
                {isDetectingStartGPS ? (
                  <ActivityIndicator size="small" color={COLORS.tealPrimary} />
                ) : (
                  <>
                    <Ionicons name="locate" size={14} color={COLORS.tealPrimary} />
                    <Text style={styles.refreshLocText}>GPS Fix</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setStartLocation({
                    name: homeZone.name || 'Home Zone',
                    address: homeZone.address || 'Home Zone',
                    latitude: homeZone.latitude || 17.3850,
                    longitude: homeZone.longitude || 78.4867,
                  });
                }}
                style={styles.useHomeBtnSmall}
              >
                <Ionicons name="home-outline" size={12} color={COLORS.brandGreen} />
                <Text style={styles.useHomeBtnText}>Use Home</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.originBox}>
              <View style={styles.originIconCircle}>
                <Ionicons name="navigate-circle" size={24} color={COLORS.tealPrimary} />
              </View>
              <View style={styles.originTextCol}>
                <Text style={styles.originName}>{startLocation.name}</Text>
                <Text style={styles.originAddress} numberOfLines={2}>
                  {startLocation.address}
                </Text>
                <Text style={styles.originCoords}>
                  GPS: {Math.abs(startLocation.latitude).toFixed(4)}° {startLocation.latitude >= 0 ? 'N' : 'S'},{' '}
                  {Math.abs(startLocation.longitude).toFixed(4)}° {startLocation.longitude >= 0 ? 'E' : 'W'}
                </Text>
              </View>
            </View>
          </View>

          {/* ========================================================
              2. CHOOSE DESTINATION & THE WOW ROUTE ARRIVAL COCKPIT
             ======================================================== */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>2. Destination & Route</Text>

              <View style={styles.segmentedToggle}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setIsCustomDest(true)}
                  style={[styles.segBtn, isCustomDest && styles.segBtnActive]}
                >
                  <Text style={[styles.segBtnText, isCustomDest && styles.segBtnTextActive]}>
                    Search
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setIsCustomDest(false)}
                  style={[styles.segBtn, !isCustomDest && styles.segBtnActive]}
                >
                  <Text style={[styles.segBtnText, !isCustomDest && styles.segBtnTextActive]}>
                    Saved ({destinations.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {isCustomDest ? (
              <View style={styles.customDestBox}>
                <Text style={styles.inputLabel}>Where would you like to travel?</Text>
                <View style={styles.customInputWrapper}>
                  <Ionicons name="search" size={18} color={COLORS.tealPrimary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="Search any place, station, college, street..."
                    placeholderTextColor={COLORS.grayTextMuted}
                    value={customDestName}
                    onChangeText={(txt) => {
                      suppressSearchRef.current = false;
                      setCustomDestName(txt);
                    }}
                  />
                  {customDestName.length > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        suppressSearchRef.current = false;
                        setCustomDestName('');
                        setSearchResults([]);
                        setGeocodedDest(null);
                        setRouteEstimates(null);
                      }}
                    >
                      <Ionicons name="close-circle" size={18} color={COLORS.grayTextMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {isSearching && (
                  <View style={styles.searchingRow}>
                    <ActivityIndicator size="small" color={COLORS.tealPrimary} />
                    <Text style={styles.searchingText}>Searching live places...</Text>
                  </View>
                )}

                {searchResults.length > 0 && (
                  <View style={styles.searchResultsDropdown}>
                    {searchResults.map((item, idx) => (
                      <TouchableOpacity
                        key={item.name + '_' + idx}
                        activeOpacity={0.7}
                        onPress={() => {
                          suppressSearchRef.current = true;
                          setIsSearching(false);
                          setIsGeocoding(false);
                          setSearchResults([]);
                          setCustomDestName(item.name);
                          setGeocodedDest({
                            ...item,
                            arrivalTime: item.arrivalTime || '',
                          });
                        }}
                        style={styles.searchResultItem}
                      >
                        <View style={styles.searchResultIconBox}>
                          <Ionicons name="location-sharp" size={16} color={COLORS.tealPrimary} />
                        </View>
                        <View style={styles.searchResultTextBox}>
                          <Text style={styles.searchResultTitle}>{item.name}</Text>
                          <Text style={styles.searchResultSub} numberOfLines={1}>
                            {item.address}
                          </Text>
                        </View>
                        <View style={styles.searchDistPill}>
                          <Text style={styles.searchDistText}>{item.distanceKm} km</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.destinationList}>
                {destinations.length === 0 ? (
                  <View style={styles.emptySavedBox}>
                    <Ionicons name="bookmark-outline" size={24} color={COLORS.grayTextMuted} />
                    <Text style={styles.emptySavedTitle}>No saved destinations yet</Text>
                    <Text style={styles.emptySavedSubtitle}>
                      Use the "Search" tab above to find any location, or save frequent places in the Destinations tab.
                    </Text>
                  </View>
                ) : (
                  destinations.map((dest) => {
                    const isSelected = !isCustomDest && selectedDestination?.id === dest.id;
                    const distFromStart = isSelected && activeDistanceKm > 0
                      ? activeDistanceKm
                      : dest.latitude && dest.longitude
                      ? Math.max(
                          Number(
                            (
                              locationService.calculateDistanceKm(
                                startLocation.latitude,
                                startLocation.longitude,
                                dest.latitude,
                                dest.longitude
                              ) * 1.26
                            ).toFixed(1)
                          ),
                          0.2
                        )
                      : dest.distanceKm || 5;
                    const modeEtaMins = isSelected && calculatedMinutes > 0
                      ? calculatedMinutes
                      : Math.max(Math.round((distFromStart / selectedMode.speedKmH) * 60), 1);
                    return (
                      <TouchableOpacity
                        key={dest.id}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedDestination(dest);
                          setIsCustomDest(false);
                        }}
                        style={[styles.destOption, isSelected && styles.destOptionSelected]}
                      >
                        <View style={styles.destRadio}>
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSelected ? COLORS.tealPrimary : COLORS.grayTextMuted}
                          />
                        </View>

                        <View style={styles.destTextWrap}>
                          <View style={styles.destTitleRow}>
                            <Text style={[styles.destName, isSelected && styles.destNameSelected]}>
                              {dest.name}
                            </Text>
                            <View style={styles.destCatBadge}>
                              <Text style={styles.destCatText}>{dest.category}</Text>
                            </View>
                          </View>
                          <Text style={styles.destAddress} numberOfLines={1}>
                            {dest.address}
                          </Text>
                        </View>

                        <Text style={styles.destEtaText}>{distFromStart.toFixed(1)} km • {modeEtaMins}m</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* ========================================================
                THE WOW ROUTE & ARRIVAL TIME COCKPIT CARD
               ======================================================== */}
            <View style={styles.routeCockpitCard}>
              {/* Left Route Stem Indicator */}
              <View style={styles.cockpitStemCol}>
                <View style={styles.pickupHalo}>
                  <View style={styles.pickupCore} />
                </View>

                <View style={styles.stemDottedTrack} />

                <View style={styles.dropPinHalo}>
                  <Ionicons name="location" size={14} color="#EF4444" />
                </View>
              </View>

              {/* Center Route Labels */}
              <View style={styles.cockpitDetailsCol}>
                <View style={styles.stopBlock}>
                  <Text style={styles.stopMicroLabel}>DEPARTURE POINT</Text>
                  <Text style={styles.stopMainTitle} numberOfLines={1}>{startLocation.name}</Text>
                  <Text style={styles.stopSubTitle} numberOfLines={1}>{startLocation.address}</Text>
                </View>

                <View style={styles.stopBlock}>
                  <Text style={styles.stopMicroLabel}>DESTINATION POINT</Text>
                  <Text style={styles.stopMainTitleDest} numberOfLines={1}>{activeDestName}</Text>
                  <Text style={styles.stopSubTitleDest} numberOfLines={1}>
                    {isGeocoding ? 'Resolving live road path...' : activeDestAddress}
                  </Text>
                </View>
              </View>

              {/* Right Arrival Box */}
              <View style={[styles.cockpitArrivalBox, !hasDestinationSelected && styles.cockpitArrivalBoxPending]}>
                <View style={styles.arrivalPill}>
                  <Ionicons
                    name="time"
                    size={12}
                    color={hasDestinationSelected ? COLORS.tealPrimary : COLORS.grayTextMuted}
                  />
                  <Text style={[styles.arrivalPillText, !hasDestinationSelected && styles.arrivalPillTextPending]}>
                    {hasDestinationSelected ? 'EST. ARRIVAL' : 'CHOOSE PLACE'}
                  </Text>
                </View>

                <Text style={[styles.arrivalLargeClock, !hasDestinationSelected && styles.arrivalLargeClockPending]}>
                  {hasDestinationSelected ? formattedArrivalTime : '--:--'}
                </Text>

                <View style={styles.distanceSpeedBadge}>
                  <Text style={styles.distanceSpeedText}>
                    {hasDestinationSelected
                      ? isCalculatingRoute && !selectedEstimate.isExactRoad
                        ? `Calculating route... (~${activeDistanceKm.toFixed(1)} km)`
                        : `${activeDistanceKm.toFixed(1)} km @ ${activeSpeedKmH} km/h • ${calculatedMinutes} mins`
                      : 'Destination required'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ========================================================
              3. TRANSPORT MODE WITH DYNAMIC TELEMETRY & ETA
             ======================================================== */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sectionTitle}>3. Transport Mode</Text>
                <View style={styles.modeActiveCountPill}>
                  <Text style={styles.modeActiveCountText}>{selectedMode.label}</Text>
                </View>
              </View>
              <Text style={styles.speedSubHint}>
                {hasDestinationSelected
                  ? isCalculatingRoute
                    ? 'Fetching exact road distance & ETA...'
                    : selectedEstimate.isExactRoad
                    ? 'Exact road distance & live ETA'
                    : 'Estimated road distance & ETA'
                  : 'Select a destination for exact km & mins'}
              </Text>
            </View>

            <View style={styles.modeGrid}>
              {TRANSPORT_MODES.map((mode) => {
                const isSelected = transportMode === mode.id;
                const est = getModeEstimate(mode);
                return (
                  <TouchableOpacity
                    key={mode.id}
                    activeOpacity={0.8}
                    onPress={() => setTransportMode(mode.id)}
                    style={[
                      styles.modeCard,
                      isSelected && {
                        borderColor: mode.themeColor,
                        backgroundColor: mode.bgTint,
                        borderWidth: 2,
                        shadowColor: mode.themeColor,
                        shadowOpacity: 0.18,
                        shadowRadius: 8,
                        elevation: 4,
                      },
                    ]}
                  >
                    {/* Selected Checkmark Badge */}
                    {isSelected && (
                      <View style={[styles.modeSelectedTick, { backgroundColor: mode.themeColor }]}>
                        <Ionicons name="checkmark" size={10} color={COLORS.white} />
                      </View>
                    )}

                    {/* Vector Icon in Liquid Glass Badge */}
                    {isSelected ? (
                      <LinearGradient
                        colors={[
                          'rgba(255,255,255,0.38)',
                          `${mode.themeColor}B8`,
                          `${mode.themeColor}E0`,
                          'rgba(0,0,0,0.04)',
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.modeIconCircle, { borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }]}
                      >
                        <Ionicons
                          name={mode.icon}
                          size={22}
                          color="#FFFFFF"
                        />
                      </LinearGradient>
                    ) : (
                      <View
                        style={[
                          styles.modeIconCircle,
                          { backgroundColor: '#F1F5F9' },
                        ]}
                      >
                        <Ionicons
                          name={mode.icon}
                          size={22}
                          color={COLORS.grayTextSecondary}
                        />
                      </View>
                    )}

                    <Text
                      style={[
                        styles.modeLabel,
                        isSelected && { color: mode.themeColor, fontWeight: '800' },
                      ]}
                      numberOfLines={1}
                    >
                      {mode.label}
                    </Text>

                    {/* Exact Calculated Duration Badge */}
                    <View
                      style={[
                        styles.modeEtaBadge,
                        isSelected ? { backgroundColor: COLORS.white } : { backgroundColor: '#E2E8F0' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeEtaBadgeText,
                          isSelected && { color: mode.themeColor, fontWeight: '800' },
                        ]}
                      >
                        {getModeDuration(mode)}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.modeDistSub,
                        isSelected && hasDestinationSelected && { color: mode.themeColor },
                      ]}
                      numberOfLines={1}
                    >
                      {hasDestinationSelected ? `${est.distanceKm.toFixed(1)} km` : mode.sublabel}
                    </Text>

                    {hasDestinationSelected && (
                      <Text style={styles.modeSpeedSub} numberOfLines={1}>
                        {est.speedKmH} km/h
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
            </View>

            <View style={isWideDesktop ? styles.webRightCol : undefined}>
          {/* ========================================================
              4B. LIVE INTERACTIVE ROUTE PREVIEW MAP
             ======================================================== */}
          <View style={{ marginBottom: SPACING.md }}>
            <ActiveJourneyMap
              origin={{
                latitude: startLocation.latitude,
                longitude: startLocation.longitude,
                name: startLocation.name,
                address: startLocation.address,
              }}
              destination={{
                latitude: activeDestLat,
                longitude: activeDestLon,
                name: hasDestinationSelected ? activeDestName : 'Select Destination',
                address: hasDestinationSelected ? activeDestAddress : 'Choose a destination above',
              }}
              progressPercent={5}
              transportMode={transportMode}
              remainingMinutes={calculatedMinutes}
              remainingDistanceKm={parseFloat(activeDistanceKm.toFixed(1))}
              routePath={hasDestinationSelected ? activeRoutePath : undefined}
              height={isWideDesktop ? 410 : 340}
            />
          </View>

          {/* ========================================================
              4. FAMILY SAFEGUARD SUMMARY
             ======================================================== */}
          <View style={[styles.safetyInfoBox, !hasDestinationSelected && styles.safetyInfoBoxPending]}>
            <View style={[styles.shieldHalo, !hasDestinationSelected && styles.shieldHaloPending]}>
              <Ionicons
                name="shield-checkmark"
                size={22}
                color={hasDestinationSelected ? COLORS.tealPrimary : COLORS.grayTextMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.safetyCardTitle}>
                {hasDestinationSelected ? 'SafeTrip Family Shield Armed' : 'SafeTrip Protection Armed'}
              </Text>
              <Text style={styles.safetyText}>
                {hasDestinationSelected ? (
                  <>
                    Your family contacts will receive an automatic departure alert and live GPS link.
                    Scheduled arrival at <Text style={styles.boldText}>{activeDestName}</Text> is{' '}
                    <Text style={styles.boldArrival}>{formattedArrivalTime}</Text> ({calculatedMinutes} mins via{' '}
                    {selectedMode.label}).
                  </>
                ) : (
                  <>Select or search a destination above to arm automated family departure alerts and view your live ETA.</>
                )}
              </Text>
            </View>
          </View>

          {/* ========================================================
              5. HIGH-IMPACT START TRIP CTA
             ======================================================== */}
          <SafeButton
            title={
              !user.email
                ? 'Sign In to Start Journey'
                : !hasDestinationSelected
                ? 'Select a Destination to Start'
                : `Start Journey to ${activeDestName}`
            }
            variant="teal"
            size="lg"
            loading={isStarting}
            disabled={!hasDestinationSelected && !!user.email}
            onPress={handleConfirmStartTrip}
            showArrow
            icon={<Ionicons name={!user.email ? 'lock-closed' : 'paper-plane'} size={18} color={COLORS.white} />}
            style={styles.confirmBtn}
          />
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
    backgroundColor: COLORS.bgSecondary,
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
  sectionTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },
  liveOriginBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.tealMuted,
  },
  pulseDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.tealPrimary,
    marginRight: 4,
  },
  liveOriginText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.tealPrimary,
    letterSpacing: 0.5,
  },
  refreshLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: COLORS.tealSoft,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.tealMuted,
  },
  refreshLocText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.tealPrimary,
    marginLeft: 4,
  },
  useHomeBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: COLORS.brandGreenSoft,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    marginLeft: 6,
  },
  useHomeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandGreenDark,
    marginLeft: 3,
  },
  originBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  originIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  originTextCol: {
    flex: 1,
  },
  originName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },
  originAddress: {
    fontSize: 12,
    color: COLORS.grayTextSecondary,
    marginTop: 2,
  },
  originCoords: {
    fontSize: 11,
    color: COLORS.tealPrimary,
    fontWeight: '600',
    marginTop: 3,
  },

  /* Segmented switch */
  segmentedToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 3,
    borderRadius: RADIUS.full,
  },
  segBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  segBtnActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.subtle,
  },
  segBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.grayTextSecondary,
  },
  segBtnTextActive: {
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },

  /* Search Results & Autocomplete Dropdown */
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  searchingText: {
    fontSize: 12,
    color: COLORS.tealPrimary,
    fontWeight: '600',
  },
  searchResultsDropdown: {
    marginTop: 6,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    ...SHADOWS.subtle,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchResultIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  searchResultTextBox: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  searchResultSub: {
    fontSize: 11.5,
    color: COLORS.grayTextSecondary,
    marginTop: 1,
  },
  searchDistPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginLeft: 8,
  },
  searchDistText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tealPrimary,
  },

  /* Empty Saved Destinations Box */
  emptySavedBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginTop: SPACING.xs,
  },
  emptySavedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navyPrimary,
    marginTop: 8,
  },
  emptySavedSubtitle: {
    fontSize: 12,
    color: COLORS.grayTextSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },

  /* Input Box */
  customDestBox: {
    marginTop: SPACING.xs,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.navyPrimary,
    marginBottom: 6,
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  customTextInput: {
    flex: 1,
    height: 46,
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.navyPrimary,
  },

  /* Destination list */
  destinationList: {
    gap: 8,
    marginTop: SPACING.xs,
  },
  destOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  destOptionSelected: {
    backgroundColor: COLORS.tealSoft,
    borderColor: COLORS.tealPrimary,
  },
  destRadio: {
    marginRight: SPACING.sm,
  },
  destTextWrap: {
    flex: 1,
  },
  destTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.navyPrimary,
    marginRight: 6,
  },
  destNameSelected: {
    fontWeight: '800',
    color: COLORS.tealPrimary,
  },
  destCatBadge: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  destCatText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.grayTextSecondary,
  },
  destAddress: {
    fontSize: 12,
    color: COLORS.grayTextSecondary,
    marginTop: 2,
  },
  destEtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.navyPrimary,
    marginLeft: SPACING.sm,
  },

  /* ==========================================
     ROUTE ARRIVAL COCKPIT (CLEAN LIGHT THEME)
     ========================================== */
  routeCockpitCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.brandGreenSoft,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginTop: SPACING.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.borderGreen,
    ...SHADOWS.subtle,
  },
  cockpitStemCol: {
    width: 20,
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  pickupHalo: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  stemDottedTrack: {
    width: 2,
    height: 36,
    backgroundColor: '#CBD5E1',
    marginVertical: 3,
  },
  dropPinHalo: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cockpitDetailsCol: {
    flex: 1,
    gap: 8,
    marginRight: SPACING.xs,
  },
  stopBlock: {},
  stopMicroLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.tealPrimary,
    letterSpacing: 0.6,
  },
  stopMainTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  stopSubTitle: {
    fontSize: 11.5,
    color: COLORS.grayTextSecondary,
  },
  stopMainTitleDest: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },
  stopSubTitleDest: {
    fontSize: 11.5,
    color: COLORS.tealPrimary,
    fontWeight: '600',
  },
  cockpitArrivalBox: {
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    ...SHADOWS.subtle,
  },
  cockpitArrivalBoxPending: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  arrivalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrivalPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.tealPrimary,
    letterSpacing: 0.5,
  },
  arrivalPillTextPending: {
    color: COLORS.grayTextMuted,
  },
  arrivalLargeClock: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.navyPrimary,
    marginTop: 1,
  },
  arrivalLargeClockPending: {
    color: COLORS.grayTextMuted,
    fontSize: 18,
    marginTop: 4,
  },
  distanceSpeedBadge: {
    marginTop: 3,
  },
  distanceSpeedText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.grayTextSecondary,
  },

  /* Transport Modes */
  modeActiveCountPill: {
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  modeActiveCountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.tealPrimary,
  },
  speedSubHint: {
    fontSize: 11,
    color: COLORS.grayTextSecondary,
  },
  modeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  modeCard: {
    flex: 1,
    position: 'relative',
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  modeSelectedTick: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  modeLabel: {
    fontSize: 11.5,
    color: COLORS.grayTextSecondary,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  modeEtaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: 4,
  },
  modeEtaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.grayTextSecondary,
  },
  modeDistSub: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.navyPrimary,
    marginTop: 5,
  },
  modeSpeedSub: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.grayTextMuted,
    marginTop: 1,
  },

  /* Safeguard Card */
  safetyInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tealSoft,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.tealMuted,
    marginBottom: SPACING.md,
  },
  safetyInfoBoxPending: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  shieldHalo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    ...SHADOWS.subtle,
  },
  shieldHaloPending: {
    backgroundColor: '#F1F5F9',
  },
  safetyCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.tealPrimary,
    marginBottom: 2,
  },
  safetyText: {
    fontSize: 12,
    color: COLORS.grayTextSecondary,
    lineHeight: 17,
  },
  boldText: {
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },
  boldArrival: {
    fontWeight: '800',
    color: COLORS.tealPrimary,
  },
  confirmBtn: {
    marginBottom: SPACING.xl,
  },
  authNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenSoft,
    borderWidth: 1.5,
    borderColor: COLORS.borderGreen,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.subtle,
  },
  authNoticeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
  },
  authNoticeTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },
  authNoticeSubtitle: {
    fontSize: 11.5,
    color: COLORS.grayTextSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  authNoticeBtn: {
    backgroundColor: COLORS.tealPrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    ...SHADOWS.subtle,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  authNoticeBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
});
