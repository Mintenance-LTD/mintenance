import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { styles } from '../jobDetailsStyles';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { logger } from '../../../utils/logger';

interface RecommendedContractor {
  contractor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    skills: string[];
    rating: number | null;
    reviewCount: number;
  };
  matchScore: number;
  reasons: string[];
}

/**
 * Recommended contractors — additive homeowner-side surface for the
 * AIMatchingService ranking (Phase 3, 2026-07-17). Mirrors the web
 * RecommendedContractors card; first mobile consumer of
 * GET /api/jobs/[id]/matched-contractors.
 *
 * Informational only — the bid marketplace is unchanged (homeowner
 * still picks the winner from real bids; no auto-assign). Renders
 * nothing on error or when there are no matches so it can never break
 * the screen. Mount is gated by the caller to homeowner + status
 * 'posted' (the API is homeowner-only).
 */
export function RecommendedContractorsSection({ jobId }: { jobId: string }) {
  const [matches, setMatches] = useState<RecommendedContractor[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await mobileApiClient.get<{
          matches: RecommendedContractor[];
        }>(`/api/jobs/${jobId}/matched-contractors`);
        if (!cancelled && Array.isArray(res.matches)) {
          setMatches(res.matches.slice(0, 5));
        }
      } catch (err) {
        // Additive surface — log and render nothing.
        logger.info('Recommended contractors fetch failed (non-fatal)', {
          jobId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (!matches || matches.length === 0) return null;

  return (
    <View style={styles.sectionPadded}>
      <Text style={styles.sectionLabel}>Recommended contractors</Text>
      <Text style={styles.bidMessage}>
        Ranked by skills, coverage, rating and availability. You always choose
        the winner from the bids you receive.
      </Text>
      {matches.map((match) => {
        const name =
          match.contractor.companyName ||
          [match.contractor.firstName, match.contractor.lastName]
            .filter(Boolean)
            .join(' ') ||
          'Contractor';
        const ratingText =
          match.contractor.rating !== null
            ? `★ ${match.contractor.rating.toFixed(1)} (${match.contractor.reviewCount})`
            : null;
        return (
          <View key={match.contractor.id} style={styles.bidCard}>
            <View style={styles.bidRow}>
              <Text style={styles.bidContractorName}>{name}</Text>
              <Text style={styles.bidAmount}>{match.matchScore}% match</Text>
            </View>
            <Text style={styles.bidMessage} numberOfLines={2}>
              {[ratingText, match.contractor.skills.slice(0, 3).join(', ')]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {match.reasons.length > 0 && (
              <Text style={styles.bidMessage} numberOfLines={1}>
                {match.reasons[0]}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
