import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { SafeButton } from '../components/SafeButton';
import { useSafeRoute } from '../hooks/useSafeRouteState';
import { WebHeader } from '../components/WebHeader';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

type Props = NativeStackScreenProps<RootStackParamList, 'TripCompleted'>;

export const TripCompletedScreen: React.FC<Props> = ({ route, navigation }) => {
  const { isDesktopWeb } = useResponsiveLayout();
  const { user } = useSafeRoute();
  const details = route.params?.tripDetails || {
    destinationName: 'Destination',
    elapsedMinutes: 20,
    distanceKm: 4.2,
  };

  const handleDone = () => {
    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.container}>
      <WebHeader
        title="Arrival Confirmed"
        subtitle="Your family has been notified that you reached safely"
      />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, isDesktopWeb && styles.webScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={isDesktopWeb ? styles.webSummaryCard : undefined}>
        {/* Celebration Shield Card */}
        <View style={styles.celebrateBox}>
          <View style={styles.outerRing}>
            <View style={styles.innerCircle}>
              <Ionicons name="checkmark-sharp" size={48} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.arrivalBadge}>
            <Text style={styles.arrivalBadgeText}>SAFE ARRIVAL CONFIRMED</Text>
          </View>

          <Text style={styles.title}>You Reached Safely!</Text>
          <Text style={styles.subtitle}>
            Your travel to <Text style={styles.boldDest}>{details.destinationName}</Text> is complete and logged.
          </Text>
        </View>

        {/* Automatic Notification Confirmation Banner */}
        <View style={styles.notificationSentCard}>
          <View style={styles.notificationHeader}>
            <View style={styles.smsIconCircle}>
              <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.tealPrimary} />
            </View>
            <View style={styles.notificationHeaderTexts}>
              <Text style={styles.notificationTitle}>Family Informed Automatically</Text>
              <Text style={styles.notificationTime}>Just now • 100% Delivered</Text>
            </View>
          </View>
          <Text style={styles.notificationBody}>
            "SafeTrip: {user.name || 'Traveler'} has reached {details.destinationName} safely."
          </Text>
        </View>

        {/* Trip Summary Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Journey Summary</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="time-outline" size={20} color={COLORS.bluePrimary} />
              <Text style={styles.statValue}>{details.elapsedMinutes} mins</Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="speedometer-outline" size={20} color={COLORS.tealPrimary} />
              <Text style={styles.statValue}>{details.distanceKm} km</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.tealPrimary} />
              <Text style={styles.statValue}>100%</Text>
              <Text style={styles.statLabel}>Safety Score</Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <SafeButton
          title="Back to Home Dashboard"
          variant="teal"
          size="lg"
          onPress={handleDone}
          icon={<Ionicons name="home" size={18} color={COLORS.white} />}
          style={styles.doneBtn}
        />
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    width: '100%',
  },
  webScrollContent: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  webSummaryCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  celebrateBox: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  outerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.tealMuted,
    marginBottom: SPACING.md,
    ...SHADOWS.glowTeal,
  },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.tealPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalBadge: {
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.tealMuted,
    marginBottom: 8,
  },
  arrivalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.tealPrimary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.navyPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.grayTextSecondary,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 290,
    lineHeight: 20,
  },
  boldDest: {
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  notificationSentCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    marginBottom: SPACING.md,
    ...SHADOWS.subtle,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  smsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  notificationHeaderTexts: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navyPrimary,
  },
  notificationTime: {
    fontSize: 11.5,
    color: COLORS.tealPrimary,
    fontWeight: '600',
  },
  notificationBody: {
    fontSize: 13,
    color: COLORS.grayTextSecondary,
    fontStyle: 'italic',
    backgroundColor: COLORS.graySubtle,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  statsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    marginBottom: SPACING.xl,
    ...SHADOWS.subtle,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navyPrimary,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.navyPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.grayTextMuted,
    marginTop: 2,
  },
  doneBtn: {
    width: '100%',
  },
});
