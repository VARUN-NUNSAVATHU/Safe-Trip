import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Destination, RootStackParamList } from '../types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { useSafeRoute } from '../hooks/useSafeRouteState';
import { destinationService } from '../services/destinationService';
import { ScreenHeader } from '../components/ScreenHeader';
import { DestinationCard } from '../components/DestinationCard';
import { SafeButton } from '../components/SafeButton';
import { WebHeader } from '../components/WebHeader';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

export const DestinationsScreen: React.FC = () => {
  const { isDesktopWeb } = useResponsiveLayout();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { destinations, addDestination, deleteDestination, homeZone } = useSafeRoute();

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<Destination['category']>('College');
  const [isSaving, setIsSaving] = useState(false);

  // Search state for add modal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      distanceKm: number;
      estimatedMinutes: number;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    latitude: number;
    longitude: number;
    distanceKm: number;
    estimatedMinutes: number;
  } | null>(null);

  const categories: Destination['category'][] = ['College', 'Work', 'Gym', 'Library', 'Family', 'Other'];

  // Debounced search for places in modal
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await destinationService.searchPlaces(
          searchQuery.trim(),
          homeZone.latitude || 16.4613,
          homeZone.longitude || 80.5069
        );
        setSearchResults(results);
      } catch (err) {
        console.warn('Destination search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, homeZone.latitude, homeZone.longitude]);

  const handleSelectPlace = (place: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
    estimatedMinutes: number;
  }) => {
    setName(place.name);
    setAddress(place.address);
    setSelectedPlace({
      latitude: place.latitude,
      longitude: place.longitude,
      distanceKm: place.distanceKm,
      estimatedMinutes: place.estimatedMinutes,
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSaveNew = async () => {
    if (!name.trim()) return;
    setIsSaving(true);

    try {
      let lat = selectedPlace?.latitude;
      let lon = selectedPlace?.longitude;
      let dist = selectedPlace?.distanceKm;
      let est = selectedPlace?.estimatedMinutes;

      if (!lat || !lon) {
        const query = address.trim() || name.trim();
        const geo = await destinationService.geocodeQuery(
          query,
          homeZone.latitude || 16.4613,
          homeZone.longitude || 80.5069,
          'Car'
        );
        lat = geo.latitude;
        lon = geo.longitude;
        dist = geo.distanceKm;
        est = geo.estimatedMinutes;
      }

      await addDestination({
        name: name.trim(),
        address: address.trim() || name.trim(),
        category,
        icon:
          category === 'College'
            ? 'school-outline'
            : category === 'Work'
            ? 'briefcase-outline'
            : category === 'Gym'
            ? 'barbell-outline'
            : category === 'Library'
            ? 'book-outline'
            : category === 'Family'
            ? 'heart-outline'
            : 'location-outline',
        latitude: lat,
        longitude: lon,
        estimatedMinutes: est || 20,
        distanceKm: dist || 5.0,
      });

      setName('');
      setAddress('');
      setSearchQuery('');
      setSelectedPlace(null);
      setModalVisible(false);
    } catch (err) {
      console.warn('Failed to save destination:', err);
      // Fallback
      addDestination({
        name: name.trim(),
        address: address.trim() || name.trim(),
        category,
        icon: 'location-outline',
        latitude: 16.5062,
        longitude: 80.648,
        estimatedMinutes: 20,
        distanceKm: 5.0,
      });
      setName('');
      setAddress('');
      setSearchQuery('');
      setSelectedPlace(null);
      setModalVisible(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <WebHeader
        activeRoute="DestinationsTab"
        title="Saved Destinations"
        subtitle="Manage personal quick-launch stops for campus, work, gym & family visits"
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setModalVisible(true)}
            style={styles.webAddDestBtn}
          >
            <Ionicons name="add" size={18} color={COLORS.white} />
            <Text style={styles.webAddDestBtnText}>Add Destination</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={[styles.scrollContent, isDesktopWeb && styles.webScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.responsiveShell, isDesktopWeb && styles.webResponsiveShell]}>
          {!isDesktopWeb && (
            <ScreenHeader
              title="Saved Destinations"
              subtitle="Only your personal destinations appear here"
              rightAction={
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setModalVisible(true)}
                  style={styles.addBtn}
                >
                  <LinearGradient
                    colors={['#52D14F', '#42B83F', '#2E8B2B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="add" size={20} color={COLORS.white} />
                  </LinearGradient>
                </TouchableOpacity>
              }
            />
          )}

          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.tealPrimary} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Frequent destinations allow 1-tap journey starts and instant ETA departure alerts to your parents.
            </Text>
          </View>

          {destinations.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="location-outline" size={34} color={COLORS.tealPrimary} />
              </View>
              <Text style={styles.emptyTitle}>No Destinations Saved Yet</Text>
              <Text style={styles.emptySubtitle}>
                You have not added any destination. Tap "+ Add Destination" below to save your college, office, or frequently visited stops.
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setModalVisible(true)}
                style={styles.emptyAddBtn}
              >
                <Ionicons name="add" size={18} color={COLORS.white} />
                <Text style={styles.emptyAddBtnText}>Add Destination</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.destList, isDesktopWeb && styles.webDestGrid]}>
              {destinations.map((item) => (
                <View key={item.id} style={isDesktopWeb ? styles.webDestItem : undefined}>
                  <DestinationCard
                    destination={item}
                    onPress={() => navigation.navigate('StartTrip', { preselectedDestination: item })}
                    onStartTrip={() => navigation.navigate('StartTrip', { preselectedDestination: item })}
                    onDelete={() => deleteDestination(item.id)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add New Destination Modal */}
      <Modal visible={modalVisible} transparent animationType={isDesktopWeb ? 'fade' : 'slide'}>
        <View style={[styles.modalOverlay, isDesktopWeb && styles.webModalOverlay]}>
          <View style={[styles.modalContent, isDesktopWeb && styles.webModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Destination</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <Ionicons name="close" size={22} color={COLORS.navyPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: SPACING.xs }}
            >
              {/* Live Search Bar inside Modal */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Search Real Places (Autocomplete)</Text>
                <View style={styles.searchInputRow}>
                  <Ionicons name="search" size={18} color={COLORS.tealPrimary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.modalSearchInput}
                    placeholder="Type place name, college, station..."
                    placeholderTextColor={COLORS.grayTextMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity activeOpacity={0.7} onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                      <Ionicons name="close-circle" size={18} color={COLORS.grayTextMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {isSearching && (
                  <View style={styles.modalSearchStatus}>
                    <ActivityIndicator size="small" color={COLORS.tealPrimary} />
                    <Text style={styles.modalSearchStatusText}>Finding matching locations...</Text>
                  </View>
                )}

                {searchResults.length > 0 && (
                  <View style={styles.modalSearchDropdown}>
                    {searchResults.map((item, idx) => (
                      <TouchableOpacity
                        key={item.name + '_' + idx}
                        activeOpacity={0.7}
                        onPress={() => handleSelectPlace(item)}
                        style={styles.modalSearchItem}
                      >
                        <Ionicons name="location-sharp" size={16} color={COLORS.tealPrimary} style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modalSearchItemTitle}>{item.name}</Text>
                          <Text style={styles.modalSearchItemSub} numberOfLines={1}>{item.address}</Text>
                        </View>
                        <Text style={styles.modalSearchItemDist}>{item.distanceKm} km</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Location Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. KL University, Benz Circle"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Street Address or Area</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Vaddeswaram, Vijayawada"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      activeOpacity={0.7}
                      onPress={() => setCategory(cat)}
                      style={[styles.catChip, category === cat && styles.catChipActive]}
                    >
                      <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <SafeButton
                title={isSaving ? 'Finding & Saving...' : 'Save Destination'}
                variant="teal"
                size="lg"
                loading={isSaving}
                onPress={handleSaveNew}
                style={{ marginTop: SPACING.md }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  webAddDestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.tealPrimary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    ...SHADOWS.glowTeal,
  },
  webAddDestBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
  },
  webDestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  webDestItem: {
    width: '48.8%',
  },
  webModalOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webModalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    borderRadius: RADIUS.xl,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: COLORS.brandGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blueSoft,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },
  infoIcon: {
    marginRight: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.navyPrimary,
    lineHeight: 18,
  },
  destList: {
    gap: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 40, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '88%',
    ...SHADOWS.float,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navyPrimary,
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: COLORS.graySubtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
    color: COLORS.navyPrimary,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.graySubtle,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  catChipActive: {
    backgroundColor: COLORS.tealSoft,
    borderColor: COLORS.tealPrimary,
  },
  catChipText: {
    fontSize: 13,
    color: COLORS.navyPrimary,
    fontWeight: '500',
  },
  catChipTextActive: {
    color: COLORS.tealPrimary,
    fontWeight: '700',
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: SPACING.sm,
    ...SHADOWS.subtle,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.navyPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.grayTextSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tealPrimary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: RADIUS.full,
    gap: 6,
    ...SHADOWS.glowTeal,
  },
  emptyAddBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.white,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: COLORS.graySubtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.navyPrimary,
  },
  modalSearchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  modalSearchStatusText: {
    fontSize: 11.5,
    color: COLORS.tealPrimary,
    fontWeight: '600',
  },
  modalSearchDropdown: {
    marginTop: 6,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    maxHeight: 180,
    overflow: 'hidden',
    ...SHADOWS.subtle,
  },
  modalSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalSearchItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  modalSearchItemSub: {
    fontSize: 11,
    color: COLORS.grayTextSecondary,
    marginTop: 1,
  },
  modalSearchItemDist: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tealPrimary,
    marginLeft: 6,
  },
});
