import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { ActiveTripState, HomeZone } from '../types';

interface SafetyCardProps {
  homeZone: HomeZone;
  activeTrip: ActiveTripState | null;
  onPressHomeZone?: () => void;
  onPressActiveTrip?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const SafetyCard: React.FC<SafetyCardProps> = ({
  homeZone,
  activeTrip,
  onPressHomeZone,
  onPressActiveTrip,
  containerStyle,
}) => {
  const isTripActive = !!activeTrip;

  return (
    <View style={[styles.cardContainer, containerStyle]}>
      {isTripActive ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPressActiveTrip}
          style={[styles.contentBox, styles.activeTripBox]}
        >
          <View style={styles.topRow}>
            <View style={styles.badgeTripActive}>
              <View style={styles.pulseDotOrange} />
              <Text style={styles.badgeTextActive}>TRIP ACTIVE</Text>
            </View>
            <Text style={styles.etaText}>~{activeTrip.estimatedArrivalMinutes} min</Text>
          </View>

          <View style={styles.mainInfoRow}>
            <View style={styles.iconCircleBlue}>
              <Ionicons name="navigate" size={26} color={COLORS.bluePrimary} />
            </View>
            <View style={styles.textColumn}>
              <Text style={styles.titleTrip}>Heading to {activeTrip.destination.name}</Text>
              <Text style={styles.subtitleTrip}>
                {activeTrip.notifiedContacts.length} family contacts notified & monitoring
              </Text>
            </View>
          </View>

          <View style={styles.footerRowActive}>
            <Text style={styles.footerActionText}>Tap to view live tracking & arrival options</Text>
            <View style={styles.actionArrowBadge}>
              <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPressHomeZone}
          style={[styles.contentBox, styles.safeBox]}
        >
          <View style={styles.topRow}>
            <View style={styles.badgeSafe}>
              <View style={styles.pulseDotTeal} />
              <Text style={styles.badgeTextSafe}>SAFE / NO ACTIVE TRIP</Text>
            </View>
            <Text style={styles.geofenceActiveText}>Geofence Active</Text>
          </View>

          <View style={styles.mainInfoRow}>
            <View style={styles.iconCircleTeal}>
              <Ionicons name="shield-checkmark" size={28} color={COLORS.tealPrimary} />
            </View>
            <View style={styles.textColumn}>
              <Text style={styles.titleSafe}>{homeZone.name || 'Home Zone Protected'}</Text>
              <Text style={styles.subtitleSafe} numberOfLines={2}>
                {homeZone.address}
              </Text>
              <Text style={styles.radiusMeta}>
                Perimeter: {homeZone.radiusMeters}m radius • GPS: {homeZone.latitude.toFixed(4)}°, {homeZone.longitude.toFixed(4)}°
              </Text>
            </View>
          </View>

          <View style={styles.footerRowSafe}>
            <Ionicons name="location-outline" size={15} color={COLORS.grayTextSecondary} />
            <Text style={styles.footerSafeMeta}>Status: Inside boundary • Tap to edit home location</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  contentBox: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  safeBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  activeTripBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.brandGreen,
    ...SHADOWS.glowGreen,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  badgeSafe: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenSoft,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
  },
  pulseDotTeal: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brandGreen,
    marginRight: 6,
  },
  badgeTextSafe: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandGreenDark,
    letterSpacing: 0.5,
  },
  geofenceActiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  badgeTripActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningSoft,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },
  pulseDotOrange: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warningOrange,
    marginRight: 6,
  },
  badgeTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warningOrangeDark,
    letterSpacing: 0.5,
  },
  etaText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandGreenDark,
  },
  mainInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  iconCircleTeal: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.brandGreenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  iconCircleBlue: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.brandGreenSoft,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  textColumn: {
    flex: 1,
  },
  titleSafe: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitleSafe: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  radiusMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  titleTrip: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitleTrip: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footerRowSafe: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerSafeMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  footerRowActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerActionText: {
    fontSize: 12,
    color: COLORS.brandGreenDark,
    fontWeight: '700',
  },
  actionArrowBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glowGreen,
  },
});
