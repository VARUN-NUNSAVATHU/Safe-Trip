import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../utils/theme';
import { FamilyContact } from '../types';

interface ContactItemProps {
  contact: FamilyContact;
  onToggleDeparture: () => void;
  onToggleArrival: () => void;
  onDelete?: () => void;
}

export const ContactItem: React.FC<ContactItemProps> = ({
  contact,
  onToggleDeparture,
  onToggleArrival,
  onDelete,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: contact.avatarColor || COLORS.tealPrimary }]}>
          <Text style={styles.avatarText}>{getInitials(contact.name)}</Text>
        </View>

        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{contact.name}</Text>
            {contact.isEmergencyContact && (
              <View style={styles.emergencyPill}>
                <Ionicons name="star" size={10} color={COLORS.tealPrimary} />
                <Text style={styles.emergencyText}>Priority</Text>
              </View>
            )}
          </View>
          <Text style={styles.phone}>{contact.phone}</Text>
          <Text style={styles.relationship}>{contact.relationship}</Text>
        </View>

        {onDelete && (
          <TouchableOpacity activeOpacity={0.7} onPress={onDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={COLORS.grayTextMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      {/* Notification Preferences */}
      <View style={styles.togglesRow}>
        <View style={styles.toggleItem}>
          <View style={styles.toggleLabelBox}>
            <Ionicons name="exit-outline" size={14} color={COLORS.brandGreen} />
            <Text style={styles.toggleLabel}>Notify on Departure</Text>
          </View>
          <Switch
            value={contact.notifyOnDeparture}
            onValueChange={onToggleDeparture}
            trackColor={{ false: COLORS.borderLight, true: COLORS.brandGreen }}
            thumbColor={COLORS.white}
          />
        </View>

        <View style={styles.toggleItem}>
          <View style={styles.toggleLabelBox}>
            <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.brandGreen} />
            <Text style={styles.toggleLabel}>Notify on Arrival</Text>
          </View>
          <Switch
            value={contact.notifyOnArrival}
            onValueChange={onToggleArrival}
            trackColor={{ false: COLORS.borderLight, true: COLORS.brandGreen }}
            thumbColor={COLORS.white}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginRight: 6,
  },
  emergencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreenSoft,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
  },
  emergencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.brandGreenDark,
    marginLeft: 3,
  },
  phone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  relationship: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.brandGreenDark,
    marginTop: 2,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  togglesRow: {
    flexDirection: 'column',
    gap: 8,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginLeft: 6,
    fontWeight: '500',
  },
});
