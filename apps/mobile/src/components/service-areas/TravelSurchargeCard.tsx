/**
 * TravelSurchargeCard — paper card showing the contractor's travel
 * surcharge as it applies beyond the standard radius.
 *
 * Display-only on this screen — editing happens in
 * `CreateServiceAreaModal` per-area today. A future "tap to edit" CTA
 * could open the area's per-km rate field; left out for now to avoid
 * conflating screen scope with modal mutations.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

interface Props {
  thresholdMiles: number;
  ratePerMile: number;
  formatCurrency: (n: number) => string;
}

const NUM_TICKS = 12;

export const TravelSurchargeCard: React.FC<Props> = ({
  thresholdMiles,
  ratePerMile,
  formatCurrency,
}) => {
  // Slider track is purely visual — fixed two-thirds fill to suggest a
  // typical mid-range setting. We deliberately don't pretend this is
  // interactive when the underlying rate isn't editable from here.
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>
          Travel surcharge after {thresholdMiles} mi
        </Text>
        <Text style={styles.rate}>{formatCurrency(ratePerMile)} / mi</Text>
      </View>
      <View style={styles.track}>
        <View style={styles.trackFill} />
        <View style={styles.trackThumb} />
      </View>
      <View style={styles.tickRow}>
        {Array.from({ length: NUM_TICKS }).map((_, i) => (
          <View key={i} style={styles.tick} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink,
  },
  rate: {
    fontFamily: me.font.display,
    fontSize: 18,
    color: me.brand,
    letterSpacing: me.displayTracking,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: me.bg2,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  trackFill: {
    width: '62%',
    height: 6,
    borderRadius: 3,
    backgroundColor: me.brand,
  },
  trackThumb: {
    position: 'absolute',
    left: '62%',
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: me.brand,
    borderWidth: 3,
    borderColor: me.surface,
    top: -5,
  },
  tickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  tick: {
    width: 1,
    height: 4,
    backgroundColor: me.line,
  },
});

export default TravelSurchargeCard;
