import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FamilyContact } from '../types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { useSafeRoute } from '../hooks/useSafeRouteState';
import { ScreenHeader } from '../components/ScreenHeader';
import { ContactItem } from '../components/ContactItem';
import { SafeButton } from '../components/SafeButton';
import { WebHeader } from '../components/WebHeader';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { IMAGES } from '../utils/imageAssets';

export const ContactsScreen: React.FC = () => {
  const { isDesktopWeb, isWideDesktop } = useResponsiveLayout();
  const {
    contacts,
    addContact,
    deleteContact,
    refreshContacts,
    isCloudSynced,
    toggleContactDeparture,
    toggleContactArrival,
  } = useSafeRoute();

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState<FamilyContact['relationship']>('Parent' as any);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const relationshipOptions: FamilyContact['relationship'][] = [
    'Mother',
    'Father',
    'Guardian',
    'Sibling',
    'Partner',
    'Friend',
    'Other',
  ];

  const handleSaveContact = async () => {
    if (!name.trim() || !phone.trim()) return;

    setIsSaving(true);
    try {
      await addContact({
        name: name.trim(),
        phone: phone.trim(),
        relationship,
        notifyOnDeparture: true,
        notifyOnArrival: true,
        isEmergencyContact: contacts.length < 2,
      });

      setName('');
      setPhone('');
      setModalVisible(false);
    } catch (e) {
      console.warn('[ContactsScreen] Error adding contact:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshContacts();
    setIsRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <WebHeader
        activeRoute="ContactsTab"
        title="Family Contacts"
        subtitle="Trusted people automatically alerted when you depart and arrive safely"
        rightAction={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setModalVisible(true)}
            style={styles.webAddContactBtn}
          >
            <Ionicons name="person-add" size={16} color={COLORS.white} />
            <Text style={styles.webAddContactBtnText}>Add Contact</Text>
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
              title="Family Contacts"
              subtitle="Trusted people alerted when you travel"
              rightAction={
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setModalVisible(true)}
                  style={styles.addBtn}
                >
                  <Ionicons name="person-add" size={18} color={COLORS.white} />
                </TouchableOpacity>
              }
            />
          )}
          {/* Backend Cloud Status Bar */}
          <View style={styles.syncRow}>
            <View style={styles.syncStatusLeft}>
              <View style={[styles.syncDot, isCloudSynced ? styles.syncDotActive : styles.syncDotOffline]} />
              <Text style={styles.syncStatusText}>
                {isCloudSynced ? 'Live Cloud Sync (Port 5000)' : 'Offline Local Storage Mode'}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleRefresh}
              style={styles.syncRefreshBtn}
              disabled={isRefreshing}
            >
              <Ionicons
                name={isRefreshing ? 'sync' : 'reload'}
                size={13}
                color={COLORS.tealPrimary}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.syncRefreshText}>{isRefreshing ? 'Syncing...' : 'Sync Now'}</Text>
            </TouchableOpacity>
          </View>

          <View style={isWideDesktop ? styles.webColumnsRow : undefined}>
            <View style={isWideDesktop ? styles.webLeftCol : undefined}>
              {/* Editorial Peace of Mind Family Banner */}
              <View style={styles.familyHeroCard}>
                <Image source={IMAGES.family} style={[styles.familyHeroImg, isWideDesktop && { height: 220 }]} resizeMode="cover" />
                <View style={styles.familyHeroOverlay}>
                  <View style={styles.familyHeroBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#166534" />
                    <Text style={styles.familyHeroBadgeText}>PEACE OF MIND</Text>
                  </View>
                  <Text style={styles.familyHeroTitle}>Connected With Family</Text>
                  <Text style={styles.familyHeroSubtitle}>
                    SafeTrip automatically shares real-time departure and arrival notifications with your chosen contacts.
                  </Text>
                </View>
              </View>
            </View>

            <View style={isWideDesktop ? styles.webRightCol : undefined}>
              {/* Contacts List */}
              {contacts.length > 0 ? (
                <View style={styles.contactsList}>
                  {contacts.map((contact) => (
                    <ContactItem
                      key={contact.id}
                      contact={contact}
                      onToggleDeparture={() => toggleContactDeparture(contact.id)}
                      onToggleArrival={() => toggleContactArrival(contact.id)}
                      onDelete={() => deleteContact(contact.id)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyContactsCard}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="people-outline" size={32} color={COLORS.tealPrimary} />
                  </View>
                  <Text style={styles.emptyTitle}>No Emergency Contacts Added</Text>
                  <Text style={styles.emptySubtitle}>
                    Contacts added to this account will receive automatic alerts when you leave home or complete a journey.
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setModalVisible(true)}
                    style={styles.emptyAddBtn}
                  >
                    <Ionicons name="person-add" size={16} color={COLORS.white} />
                    <Text style={styles.emptyAddBtnText}>Add First Contact</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add New Contact Modal */}
      <Modal visible={modalVisible} transparent animationType={isDesktopWeb ? 'fade' : 'slide'}>
        <View style={[styles.modalOverlay, isDesktopWeb && styles.webModalOverlay]}>
          <View style={[styles.modalContent, isDesktopWeb && styles.webModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Family Member</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.navyPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: SPACING.xs }}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mom, Dad, Sarah Johnson"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Phone Number (SMS alerts)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 000-0000"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Relationship</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                  {relationshipOptions.map((rel) => (
                    <TouchableOpacity
                      key={rel}
                      activeOpacity={0.7}
                      onPress={() => setRelationship(rel)}
                      style={[styles.relChip, relationship === rel && styles.relChipActive]}
                    >
                      <Text style={[styles.relChipText, relationship === rel && styles.relChipTextActive]}>
                        {rel}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <SafeButton
                title="Save Family Member"
                variant="teal"
                size="lg"
                loading={isSaving}
                onPress={handleSaveContact}
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
  webAddContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.tealPrimary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    ...SHADOWS.glowTeal,
  },
  webAddContactBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
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
    flex: 1.3,
    minWidth: 0,
  },
  webModalOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webModalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '88%',
    borderRadius: RADIUS.xl,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.tealPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glowTeal,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  syncStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  syncDotActive: {
    backgroundColor: '#10B981',
  },
  syncDotOffline: {
    backgroundColor: '#F59E0B',
  },
  syncStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.navyPrimary,
  },
  syncRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.tealSoft,
  },
  syncRefreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tealPrimary,
  },
  familyHeroCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E8F0EA',
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
    ...SHADOWS.subtle,
  },
  familyHeroImg: {
    width: '100%',
    height: 140,
  },
  familyHeroOverlay: {
    padding: SPACING.md,
    backgroundColor: '#FAFCFA',
    borderTopWidth: 1,
    borderTopColor: '#E8F0EA',
  },
  familyHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EAF8E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#C2EFC0',
    gap: 4,
  },
  familyHeroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
  },
  familyHeroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.navyPrimary,
  },
  familyHeroSubtitle: {
    fontSize: 12,
    color: COLORS.grayTextSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  contactsList: {
    gap: SPACING.xs,
  },
  emptyContactsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    marginTop: SPACING.sm,
    ...SHADOWS.subtle,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navyPrimary,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.grayTextSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 360,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealPrimary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    marginTop: 16,
    ...SHADOWS.subtle,
  },
  emptyAddBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
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
  chipsRow: {
    flexDirection: 'row',
  },
  relChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.graySubtle,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  relChipActive: {
    backgroundColor: COLORS.tealSoft,
    borderColor: COLORS.tealPrimary,
  },
  relChipText: {
    fontSize: 13,
    color: COLORS.navyPrimary,
    fontWeight: '500',
  },
  relChipTextActive: {
    color: COLORS.tealPrimary,
    fontWeight: '700',
  },
});
