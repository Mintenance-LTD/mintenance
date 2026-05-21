/**
 * JobRoomScope (mobile) — Property Rooms Slice 1
 *
 * Read-only block showing which rooms a job targets. Renders nothing
 * if the job has no snapshot (legacy jobs preserved).
 *
 * Used by BidSubmissionScreen so contractors see the same scope the
 * homeowner picked at post time. RLS on job_rooms gates visibility
 * to job participants + posted/published jobs, mirroring the parent
 * jobs table.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';

const ROOM_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  bedroom: 'Bedroom',
  living_room: 'Living room',
  dining_room: 'Dining room',
  garage: 'Garage',
  garden: 'Garden',
  exterior: 'Exterior',
  roof: 'Roof',
  hallway: 'Hallway',
  office: 'Office',
  utility: 'Utility',
  other: 'Other',
};

interface JobRoomScopeProps {
  jobId: string;
}

interface JobRoomScopeRow {
  id: string;
  property_room_id: string | null;
  name: string;
  room_type: string;
  size_sqm_at_post: number | null;
}

export const JobRoomScope: React.FC<JobRoomScopeProps> = ({ jobId }) => {
  const [rooms, setRooms] = useState<JobRoomScopeRow[]>([]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('job_rooms')
          .select('id, property_room_id, name, room_type, size_sqm_at_post')
          .eq('job_id', jobId)
          .order('created_at', { ascending: true });
        if (error) throw new Error(error.message);
        if (!cancelled) setRooms((data ?? []) as JobRoomScopeRow[]);
      } catch (e) {
        // Silent: if the user can't read the rooms (RLS), or the
        // job has none, just don't render the block.
        logger.warn('JobRoomScope: load failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (rooms.length === 0) return null;

  const totalSqm = rooms.reduce<number>(
    (sum, r) => sum + (r.size_sqm_at_post ?? 0),
    0
  );
  const anySized = rooms.some((r) => r.size_sqm_at_post != null);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>Rooms in scope</Text>
        {anySized && totalSqm > 0 ? (
          <Text style={styles.headerTotal}>{totalSqm.toFixed(1)} m² total</Text>
        ) : null}
      </View>
      <View style={styles.list}>
        {rooms.map((r) => (
          <View key={r.id} style={styles.row}>
            <Text style={styles.rowName} numberOfLines={1}>
              <Text style={styles.rowType}>
                {ROOM_TYPE_LABELS[r.room_type] ?? r.room_type}
                {' · '}
              </Text>
              {r.name}
            </Text>
            <Text style={styles.rowSqm}>
              {r.size_sqm_at_post != null
                ? `${Number(r.size_sqm_at_post).toFixed(1)} m²`
                : '— m²'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    padding: 12,
    backgroundColor: me.bg2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: me.line,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink2,
  },
  list: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowName: {
    flex: 1,
    fontSize: 13,
    color: me.ink,
  },
  rowType: {
    color: me.ink3,
  },
  rowSqm: {
    marginLeft: 8,
    fontSize: 13,
    color: me.ink2,
  },
});
