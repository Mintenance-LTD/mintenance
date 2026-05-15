/**
 * ContractorBadgesCard — dashboard surface showing the trust-
 * badge ladder the contractor has earned + a hint for the next
 * badge to unlock. Phase 3 integration of §5.5 of the 2026-04-19
 * mobile onboarding audit.
 *
 * Self-hides when the contractor has earned zero badges AND no
 * "next badge" is computable (i.e. utility returned empty + null).
 * That only happens when the profile query failed; the normal
 * "new contractor" case still shows the card with the first
 * unearned badge so they know what to work toward.
 *
 * Intentionally a small card, not a full screen. The contractor
 * dashboard already carries FinishSetupCard for pending items;
 * this card is the *earned* corollary.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContractorBadges } from '../../../hooks/useContractorBadges';
import { ContractorBadgeStack } from '../../../components/contractor/ContractorBadgeStack';
import { me } from '../../../design-system/mint-editorial';

type IoniconName = keyof typeof Ionicons.glyphMap;

export const ContractorBadgesCard: React.FC = () => {
  const { badges, next, loading } = useContractorBadges();

  // Skip rendering while the probe is in flight on first mount —
  // avoids a card-flash that would reshuffle on first data land.
  if (loading) return null;

  // Zero badges AND no "next" suggestion means the query failed;
  // hide rather than showing an empty state.
  if (badges.length === 0 && !next) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Ionicons name='ribbon' size={18} color={me.brand} />
          <Text style={styles.title}>Your trust badges</Text>
        </View>
        <Text style={styles.progressText}>{badges.length} of 5</Text>
      </View>

      {badges.length > 0 ? (
        <ContractorBadgeStack badges={badges} variant='compact' />
      ) : (
        <Text style={styles.emptyText}>
          You haven&apos;t earned any yet — finish the steps below to unlock
          your first badge.
        </Text>
      )}

      {next && (
        <View style={styles.nextRow}>
          <View style={styles.nextIconWrap}>
            <Ionicons
              name={next.iconName as IoniconName}
              size={16}
              color={me.ink2}
            />
          </View>
          <View style={styles.nextTextWrap}>
            <Text style={styles.nextLabel}>Next badge: {next.label}</Text>
            <Text style={styles.nextDescription} numberOfLines={2}>
              {next.description}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: me.ink2,
  },
  emptyText: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line2,
  },
  nextIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTextWrap: {
    flex: 1,
  },
  nextLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 2,
  },
  nextDescription: {
    fontSize: 12,
    color: me.ink2,
    lineHeight: 16,
  },
});
