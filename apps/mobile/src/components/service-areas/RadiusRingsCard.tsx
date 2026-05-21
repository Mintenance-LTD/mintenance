/**
 * RadiusRingsCard — paper-toned map-card with concentric standard +
 * extended radius rings, per redesign-v2 contractor business deck
 * screen 12.
 *
 * Not a real map (no tiles / no live GPS context) — a visual
 * representation that reads as one. Renders two SVG circles:
 *   - inner solid ring at the "standard" radius
 *   - outer dashed ring at the "extended" radius
 * with a central pin and a soft mint wash underneath. Sits below the
 * Standard / Extended pill chips so the user can see what each
 * threshold buys them.
 *
 * The card is purposely small (~200pt high). A full-bleed Mapbox view
 * would be nice but adds a dependency we don't have, and the deck's
 * value here is the spatial mental model, not interactivity.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';

interface Props {
  standardMiles: number;
  extendedMiles: number;
  selectedMode: 'standard' | 'extended';
  onSelectMode: (mode: 'standard' | 'extended') => void;
}

const CARD_HEIGHT = 200;
const CENTER_X = 160;
const CENTER_Y = 100;
const STANDARD_RADIUS_PX = 38;
const EXTENDED_RADIUS_PX = 70;

export const RadiusRingsCard: React.FC<Props> = ({
  standardMiles,
  extendedMiles,
  selectedMode,
  onSelectMode,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.chipRow}>
        <Pill
          label={`Standard · ${standardMiles} mi`}
          active={selectedMode === 'standard'}
          onPress={() => onSelectMode('standard')}
        />
        <Pill
          label={`Extended · ${extendedMiles} mi`}
          active={selectedMode === 'extended'}
          onPress={() => onSelectMode('extended')}
        />
      </View>
      <View style={styles.svgWrap}>
        <Svg width='100%' height={CARD_HEIGHT} viewBox='0 0 320 200'>
          {/* Wavy backdrop suggesting a coastline / road — a soft
              visual cue that this is a spatial card, not just rings. */}
          <Path
            d='M 0 130 Q 80 90 160 130 T 320 110'
            stroke={me.brandSoft}
            strokeWidth={10}
            fill='none'
            opacity={0.7}
          />
          {/* Extended ring — dashed at the looser threshold. */}
          <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={EXTENDED_RADIUS_PX}
            stroke={me.brand}
            strokeWidth={1.2}
            strokeDasharray='4 4'
            fill={selectedMode === 'extended' ? me.brandSoft : 'none'}
            opacity={selectedMode === 'extended' ? 0.45 : 1}
          />
          {/* Standard ring — solid mint, slightly filled. */}
          <Circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={STANDARD_RADIUS_PX}
            stroke={me.brand}
            strokeWidth={2}
            fill={selectedMode === 'standard' ? me.brandSoft : 'none'}
            opacity={0.95}
          />
          {/* Center pin. */}
          <Circle cx={CENTER_X} cy={CENTER_Y} r={5} fill={me.brand} />
        </Svg>
      </View>
    </View>
  );
};

const Pill: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
}> = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.pill, active && styles.pillActive]}
    accessibilityRole='button'
    accessibilityState={{ selected: active }}
    activeOpacity={0.85}
  >
    <Ionicons
      name={active ? 'radio-button-on' : 'radio-button-off'}
      size={12}
      color={active ? me.brand : me.ink3}
    />
    <Text style={[styles.pillText, active && styles.pillTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: me.surface,
    borderRadius: 18,
    paddingTop: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: me.bg2,
    borderWidth: 1,
    borderColor: me.line2,
  },
  pillActive: {
    backgroundColor: me.brandSoft,
    borderColor: me.brand,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: me.ink2,
  },
  pillTextActive: {
    color: me.brand,
    fontWeight: '700',
  },
  svgWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RadiusRingsCard;
