/**
 * TrustLines — R7 #9 + #11 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Two transparency one-liners shown under the contractor name:
 *   - PostcodeProofLine: "Hired by N households on M14 in the last 12 months"
 *   - DisputeHistoryLine: "12 disputes, all resolved, avg 3 days" / "2 unresolved"
 *
 * Mobile counterpart of
 * apps/web/app/contractors/[id]/components/{PostcodeProofLine,DisputeHistoryLine}.tsx.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

interface Props {
  postcodePrefix?: string | null;
  postcodeProofCount?: number | null;
  disputeHistory?: {
    resolvedCount: number;
    unresolvedCount: number;
    avgResolutionHours?: number | null;
  };
}

function formatAvg(hours: number): string {
  if (hours < 48) return `avg ${hours}h`;
  const days = Math.round(hours / 24);
  return `avg ${days} day${days === 1 ? '' : 's'}`;
}

export const TrustLines: React.FC<Props> = ({
  postcodePrefix,
  postcodeProofCount,
  disputeHistory,
}) => {
  const postcodeLine =
    postcodeProofCount && postcodeProofCount >= 2 && postcodePrefix ? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 6,
        }}
      >
        <Ionicons name='location-outline' size={14} color={me.brand} />
        <Text style={{ fontSize: 12, color: me.brand, marginLeft: 4 }}>
          Hired by {postcodeProofCount} household
          {postcodeProofCount === 1 ? '' : 's'} on {postcodePrefix} in the last
          12 months
        </Text>
      </View>
    ) : null;

  let disputeLine: React.ReactNode = null;
  if (
    disputeHistory &&
    (disputeHistory.resolvedCount > 0 || disputeHistory.unresolvedCount > 0)
  ) {
    if (disputeHistory.unresolvedCount > 0) {
      disputeLine = (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          <Ionicons name='warning-outline' size={14} color={me.accent} />
          <Text style={{ fontSize: 12, color: me.accent, marginLeft: 4 }}>
            {disputeHistory.unresolvedCount} unresolved dispute
            {disputeHistory.unresolvedCount === 1 ? '' : 's'}
            {disputeHistory.resolvedCount > 0
              ? ` · ${disputeHistory.resolvedCount} resolved`
              : ''}
          </Text>
        </View>
      );
    } else {
      disputeLine = (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          <Ionicons
            name='shield-checkmark-outline'
            size={14}
            color={me.brand}
          />
          <Text
            style={{
              fontSize: 12,
              color: me.ink2,
              marginLeft: 4,
            }}
          >
            {disputeHistory.resolvedCount} dispute
            {disputeHistory.resolvedCount === 1 ? '' : 's'}, all resolved
            {disputeHistory.avgResolutionHours != null
              ? `, ${formatAvg(disputeHistory.avgResolutionHours)}`
              : ''}
          </Text>
        </View>
      );
    }
  }

  if (!postcodeLine && !disputeLine) return null;

  return (
    <View style={{ alignItems: 'center', marginTop: 8 }}>
      {postcodeLine}
      {disputeLine}
    </View>
  );
};
