import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { SafeButton } from './SafeButton';

interface GeofenceAlertModalProps {
  visible: boolean;
  onConfirmTrip: () => void;
  onDismiss: () => void;
  onCustomDestination?: () => void;
}

export const GeofenceAlertModal: React.FC<GeofenceAlertModalProps> = ({
  visible,
  onConfirmTrip,
  onDismiss,
  onCustomDestination,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.alertCard}>
          {/* Top Alarm Warning Indicator */}
          <View style={styles.alarmBadgeContainer}>
            <View style={styles.pulseRing}>
              <View style={styles.alarmIconCircle}>
                <Ionicons name="notifications" size={28} color={COLORS.warningOrange} />
              </View>
            </View>
          </View>

          <Text style={styles.warningTag}>GEOFENCE EXIT DETECTED</Text>
          <Text style={styles.title}>You Left Your Home Zone!</Text>

          <Text style={styles.bodyText}>
            SafeTrip noticed you stepped outside your 150m home perimeter. Did you start travelling?
          </Text>

          {/* Family Reminder Box */}
          <View style={styles.reminderBox}>
            <Ionicons name="people" size={20} color={COLORS.tealPrimary} style={styles.reminderIcon} />
            <Text style={styles.reminderText}>
              Start a trip to automatically notify <Text style={styles.boldText}>Mom & Dad</Text> so they know you are on your way safely.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <SafeButton
              title="START TRIP"
              variant="teal"
              size="lg"
              onPress={onConfirmTrip}
              icon={<Ionicons name="paper-plane" size={20} color={COLORS.white} />}
              style={styles.actionBtn}
            />

            {onCustomDestination && (
              <SafeButton
                title="Choose Specific Destination"
                variant="blue"
                size="md"
                onPress={onCustomDestination}
                icon={<Ionicons name="map-outline" size={18} color={COLORS.white} />}
                style={styles.actionBtn}
              />
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onDismiss}
              style={styles.dismissBtn}
            >
              <Text style={styles.dismissText}>I'm Still Nearby (Dismiss)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 40, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  alertCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.float,
    borderWidth: 1.5,
    borderColor: COLORS.warningBorder,
  },
  alarmBadgeContainer: {
    marginBottom: SPACING.md,
    marginTop: -SPACING.xs,
  },
  pulseRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.warningBorder,
  },
  alarmIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  warningTag: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.warningOrange,
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: -0.3,
  },
  bodyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  reminderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenSoft,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  reminderIcon: {
    marginRight: SPACING.sm,
  },
  reminderText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: COLORS.brandGreenDark,
  },
  buttonGroup: {
    width: '100%',
  },
  actionBtn: {
    width: '100%',
    marginBottom: SPACING.sm,
  },
  dismissBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
