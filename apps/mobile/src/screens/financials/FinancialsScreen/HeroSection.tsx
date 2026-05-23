/**
 * Financials HeroSection — Mint Editorial v2 (2026-05-23 redesign).
 *
 * Replaces the prior full-bleed mint-gradient hero (3 decorative
 * shapes + white-on-brand stat row) with the calm editorial pattern
 * from the redesign-v2 Finance mockup: paper background, mint
 * eyebrow, serif total-spent value in ink, and a slim two-cell row
 * below for This Month + In Escrow on a bordered paper card.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import { fmt } from './constants';

interface HeroSectionProps {
  totalSpent: number;
  thisMonth: number;
  inEscrow: number;
  insetsTop: number;
  onBack: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  totalSpent,
  thisMonth,
  inEscrow,
  insetsTop,
  onBack,
}) => {
  return (
    <View style={[localStyles.wrap, { paddingTop: insetsTop + 12 }]}>
      <View style={localStyles.navRow}>
        <TouchableOpacity
          onPress={onBack}
          style={localStyles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons name='arrow-back' size={20} color={me.ink} />
        </TouchableOpacity>
      </View>

      <Text style={localStyles.eyebrow}>Finance</Text>
      <Text style={localStyles.title}>My finances</Text>

      <View style={localStyles.totalBlock}>
        <Text style={localStyles.totalLabel}>Total spent</Text>
        <Text style={localStyles.totalValue}>{fmt(totalSpent)}</Text>
      </View>

      <View style={localStyles.statRow}>
        <View style={localStyles.statCell}>
          <Text style={localStyles.statValue}>{fmt(thisMonth)}</Text>
          <Text style={localStyles.statLabel}>This month</Text>
        </View>
        <View style={localStyles.statDivider} />
        <View style={localStyles.statCell}>
          <Text style={localStyles.statValue}>{fmt(inEscrow)}</Text>
          <Text style={localStyles.statLabel}>In escrow</Text>
        </View>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: me.bg,
  },
  navRow: {
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontFamily: me.font.display,
    fontSize: 28,
    lineHeight: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
    marginBottom: 18,
  },
  totalBlock: {
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 13,
    color: me.ink3,
    fontWeight: '500',
    marginBottom: 4,
  },
  totalValue: {
    fontFamily: me.font.display,
    fontSize: 42,
    lineHeight: 46,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: me.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: me.line,
    paddingVertical: 12,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: me.font.display,
    fontSize: 22,
    lineHeight: 26,
    color: me.ink,
    letterSpacing: me.displayTracking,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: me.ink3,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: me.line,
    marginVertical: 4,
  },
});
