import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { Destination } from '../types';
import { IMAGES } from '../utils/imageAssets';

interface DestinationCardProps {
  destination: Destination;
  onPress: () => void;
  onStartTrip?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
  destination,
  onPress,
  onStartTrip,
  onDelete,
  isSelected = false,
}) => {
  const lowerName = destination.name.toLowerCase();
  const lowerCat = (destination.category || '').toLowerCase();
  const lowerAddr = (destination.address || '').toLowerCase();

  const isCollege = lowerName.includes('college') || lowerName.includes('university') || lowerName.includes('srm') || lowerCat === 'college';
  const isGym = lowerName.includes('gym') || lowerName.includes('fitzone') || lowerCat === 'gym';
  const isMall = lowerName.includes('mall') || lowerName.includes('pvp') || lowerName.includes('shopping') || lowerName.includes('square');
  const isVijayawada = lowerName.includes('vijayawada') || lowerName.includes('benz') || lowerAddr.includes('vijayawada');

  const destImage = isCollege ? IMAGES.college : isGym ? IMAGES.gym : isMall ? IMAGES.mall : isVijayawada ? IMAGES.vijayawada : null;
  const badgeLabel = isCollege ? 'CAMPUS' : isGym ? 'FIT' : isMall ? 'MALL' : isVijayawada ? 'VJA' : null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        isSelected && styles.selectedCard,
      ]}
    >
      {destImage ? (
        <View style={styles.thumbWrapper}>
          <Image
            source={destImage}
            style={styles.destThumbImage}
            resizeMode="cover"
          />
          {badgeLabel && (
            <View style={styles.vjaBadge}>
              <Text style={styles.vjaBadgeText}>{badgeLabel}</Text>
            </View>
          )}
        </View>
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.38)', `rgba(66,184,63,0.72)`, `rgba(66,184,63,0.88)`, 'rgba(0,0,0,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Ionicons
            name={(destination.icon as any) || 'location-outline'}
            size={22}
            color="#FFFFFF"
          />
        </LinearGradient>
      )}

      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{destination.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{destination.category}</Text>
          </View>
        </View>

        <Text style={styles.address} numberOfLines={1}>
          {destination.address}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.grayTextSecondary} />
            <Text style={styles.metaText}>{destination.estimatedMinutes} mins</Text>
          </View>
          <Text style={styles.bullet}>•</Text>
          <View style={styles.metaItem}>
            <Ionicons name="navigate-outline" size={13} color={COLORS.grayTextSecondary} />
            <Text style={styles.metaText}>{destination.distanceKm} km away</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRightRow}>
        {onDelete && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onDelete}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={17} color={COLORS.grayTextSecondary} />
          </TouchableOpacity>
        )}

        {onStartTrip ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onStartTrip}
            style={styles.startTripBtn}
          >
            <Ionicons name="play" size={14} color={COLORS.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.glassChevron}>
            <Ionicons name="chevron-forward" size={14} color={COLORS.brandGreen} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  selectedCard: {
    borderColor: COLORS.brandGreen,
    backgroundColor: COLORS.brandGreenSoft,
    ...SHADOWS.glowGreen,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 13, // squircle
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    shadowColor: COLORS.brandGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  thumbWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: SPACING.md,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.bgSecondary,
  },
  destThumbImage: {
    width: '100%',
    height: '100%',
  },
  vjaBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(16, 24, 40, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  vjaBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  textContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginRight: 6,
  },
  categoryBadge: {
    backgroundColor: COLORS.brandGreenSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.brandGreenDark,
  },
  address: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginLeft: 3,
    fontWeight: '500',
  },
  bullet: {
    marginHorizontal: 6,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  actionRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startTripBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glowGreen,
  },
  glassChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(66,184,63,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(66,184,63,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
