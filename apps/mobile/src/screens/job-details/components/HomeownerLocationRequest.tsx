/**
 * HomeownerLocationRequest — lets homeowners request contractor location sharing
 * and see live ETA when the contractor is sharing.
 *
 * 2026-05-23 audit-14: previously the component only POSTed a
 * notification then flipped local state to "request sent" — it never
 * read `contractor_locations`, never subscribed to Realtime, never
 * displayed an ETA. So the homeowner experience stopped exactly when
 * the contractor side started sharing, leaving the homeowner with a
 * "request sent" card and no follow-through.
 *
 * Now:
 *   - On mount, fetch the latest `contractor_locations` row for this
 *     job. The 04-17 RLS policy (`contractor_locations_select`)
 *     scopes SELECT to the contractor OR the homeowner of an
 *     assigned/in_progress job, so the row only surfaces to the
 *     intended viewer.
 *   - Subscribe to UPDATE + INSERT events on the row via Supabase
 *     Realtime so the ETA refreshes as the contractor moves.
 *   - Render ETA + a "last seen" timestamp + the sharing status.
 *
 * The "Request Live Location" CTA still POSTs the notification; once
 * a live row appears we hide the CTA and show the ETA card instead.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { supabase } from '../../../config/supabase';
import { me } from '../../../design-system/mint-editorial';
import { logger } from '../../../utils/logger';

interface Props {
  jobId: string;
}

interface LiveLocation {
  eta_minutes: number | null;
  is_sharing_location: boolean | null;
  is_active: boolean | null;
  location_timestamp: string | null;
  updated_at: string | null;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const HomeownerLocationRequest: React.FC<Props> = ({ jobId }) => {
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch the current row once on mount, then subscribe to changes.
  // RLS scopes the SELECT to (homeowner-of-assigned-job OR contractor),
  // so when this component renders for the wrong viewer the query
  // returns no rows and we stay in the request-only state.
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('contractor_locations')
          .select(
            'eta_minutes, is_sharing_location, is_active, location_timestamp, updated_at'
          )
          .eq('job_id', jobId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          // RLS denials (no row visible) come back as PGRST116 on .single()
          // but .maybeSingle() returns { data: null, error: null }. Any
          // real error gets logged + we stay silent.
          logger.warn('contractor_locations initial read failed', {
            jobId,
            error: error.message,
          });
          return;
        }
        if (data) {
          setLiveLocation(data as LiveLocation);
        }
      } catch (err) {
        logger.warn('contractor_locations read threw', {
          jobId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    // Realtime subscription — UPDATEs fire each time the contractor
    // pushes a new GPS fix (every ~5–15s via JobContextLocationService
    // upsert). INSERT fires once when the first row is written.
    const channel = supabase
      .channel(`contractor_locations:job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contractor_locations',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const row = (payload.new ??
            payload.old) as Partial<LiveLocation> | null;
          if (!row) return;
          setLiveLocation({
            eta_minutes: row.eta_minutes ?? null,
            is_sharing_location: row.is_sharing_location ?? null,
            is_active: row.is_active ?? null,
            location_timestamp: row.location_timestamp ?? null,
            updated_at: row.updated_at ?? null,
          });
        }
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      cancelled = true;
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch {
          /* removal best-effort */
        }
        channelRef.current = null;
      }
    };
  }, [jobId]);

  const handleRequestLocation = async () => {
    setLoading(true);
    try {
      await mobileApiClient.post(`/api/jobs/${jobId}/request-location`);
      setRequested(true);
    } catch {
      Alert.alert(
        'Unable to Request',
        'Could not send location request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Live state: only treat the row as "live" when the contractor is
  // actually sharing and the row is active. A stale row from a past
  // visit should not surface stale ETA data.
  const isLive =
    !!liveLocation?.is_sharing_location && !!liveLocation?.is_active;
  const eta = liveLocation?.eta_minutes ?? null;
  const lastFix =
    liveLocation?.location_timestamp ?? liveLocation?.updated_at ?? null;

  if (isLive) {
    return (
      <View>
        <Text style={styles.sectionLabel}>Contractor Location</Text>
        <View style={styles.liveCard}>
          <View style={styles.statusRow}>
            <View style={styles.livePulse} />
            <Text style={styles.liveText}>Sharing live location</Text>
          </View>
          {eta !== null ? (
            <Text style={styles.etaText}>
              {eta <= 0 ? 'Arriving now' : `~${eta} min away`}
            </Text>
          ) : (
            <Text style={styles.etaMuted}>Calculating arrival time…</Text>
          )}
          <Text style={styles.lastFixText}>
            Last update: {formatRelativeTime(lastFix)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionLabel}>Contractor Location</Text>

      {requested ? (
        <View style={styles.requestedCard}>
          <View style={styles.statusRow}>
            <Ionicons name='checkmark-circle' size={20} color={me.brand} />
            <Text style={styles.requestedText}>Location request sent</Text>
          </View>
          <Text style={styles.requestedSubtext}>
            The contractor will be notified to share their live location. Once
            they start sharing, ETA appears here automatically.
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.requestButton}
          onPress={handleRequestLocation}
          disabled={loading}
          accessibilityRole='button'
          accessibilityLabel='Request contractor location'
        >
          <Ionicons name='navigate-outline' size={20} color={me.onBrand} />
          <Text style={styles.requestButtonText}>
            {loading ? 'Sending...' : 'Request Live Location'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.brand,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  requestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.onBrand,
  },
  requestedCard: {
    backgroundColor: me.brandSoft,
    borderRadius: 12,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  requestedText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.brand,
  },
  requestedSubtext: {
    fontSize: 13,
    color: me.ink2,
    marginLeft: 28,
  },
  liveCard: {
    backgroundColor: me.brandSoft,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  livePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: me.brand,
  },
  liveText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.brand,
  },
  etaText: {
    fontSize: 22,
    fontWeight: '700',
    color: me.ink,
    marginTop: 4,
  },
  etaMuted: {
    fontSize: 14,
    color: me.ink2,
    marginTop: 4,
  },
  lastFixText: {
    fontSize: 12,
    color: me.ink3,
  },
});
