/**
 * ContractorBadgeStack — renders the earned trust-badge ladder
 * for a contractor. Phase 3 of the 2026-04-19 mobile onboarding
 * audit (§5.5).
 *
 * Two display modes:
 *   - compact (default): small icon + label chips, wraps. Used
 *     on contractor cards in search results, bid sheets,
 *     contractor-of-the-day surfaces.
 *   - single: just the icons, for tight spaces like a job-card
 *     preview where a full chip would overflow.
 *
 * The component is pure presentational — hand it the earned
 * badges from computeContractorBadges() and it renders.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import type { ContractorBadgeDef } from '../../utils/contractorBadges';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface ContractorBadgeStackProps {
  badges: ReadonlyArray<ContractorBadgeDef>;
  /**
   * 'compact' = pill-shaped icon + label chips (default)
   * 'icons' = just the icons in a row, no labels
   */
  variant?: 'compact' | 'icons';
  /**
   * Optional — passed through so contractors on their OWN
   * profile can see a hint explaining each badge. Defaults
   * to false so badges render as static UI in search results.
   */
  showTooltipOnPress?: boolean;
  /**
   * Max badges to show before collapsing to "+N more". Omit
   * for no cap.
   */
  maxVisible?: number;
}

export const ContractorBadgeStack: React.FC<ContractorBadgeStackProps> = ({
  badges,
  variant = 'compact',
  maxVisible,
}) => {
  if (badges.length === 0) return null;

  const visible =
    maxVisible != null && badges.length > maxVisible
      ? badges.slice(0, maxVisible)
      : badges;
  const overflow =
    maxVisible != null && badges.length > maxVisible
      ? badges.length - maxVisible
      : 0;

  return (
    <View
      style={
        variant === 'icons' ? styles.iconsContainer : styles.compactContainer
      }
      accessibilityLabel={`Trust badges: ${badges.map((b) => b.label).join(', ')}`}
    >
      {visible.map((badge) =>
        variant === 'icons' ? (
          <View key={badge.id} style={styles.iconOnly}>
            <Ionicons
              name={badge.iconName as IoniconName}
              size={14}
              color={theme.colors.primary}
            />
          </View>
        ) : (
          <View key={badge.id} style={styles.chip}>
            <Ionicons
              name={badge.iconName as IoniconName}
              size={12}
              color={theme.colors.primary}
            />
            <Text style={styles.chipLabel}>{badge.label}</Text>
          </View>
        )
      )}
      {overflow > 0 && (
        <View style={styles.overflowChip}>
          <Text style={styles.overflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  iconOnly: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  overflowText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
