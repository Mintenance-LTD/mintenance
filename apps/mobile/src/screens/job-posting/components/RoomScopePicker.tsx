/**
 * RoomScopePicker (mobile) — Property Rooms Slice 1
 *
 * Optional room scope picker reused by mobile job-post screens
 * (QuickJobPostScreen, JobPostingScreen). Fetches `property_rooms`
 * for the supplied propertyId via Supabase (RLS enforces ownership)
 * and renders a chip grid so the homeowner can toggle which rooms
 * this job targets. The selection is reported back via onChange and
 * eventually flows into `job_rooms` as a server-side snapshot.
 *
 * Real-data-only: when the property has no rooms the picker renders
 * a polite empty state rather than fabricating placeholders.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { me } from '../../../design-system/mint-editorial';
import { supabase } from '../../../config/supabase';
import { logger } from '../../../utils/logger';

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

interface PropertyRoomSummary {
  id: string;
  name: string;
  room_type: string;
  size_sqm: number | null;
}

interface RoomScopePickerProps {
  propertyId: string | undefined;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const RoomScopePicker: React.FC<RoomScopePickerProps> = ({
  propertyId,
  selectedIds,
  onChange,
}) => {
  const [rooms, setRooms] = useState<PropertyRoomSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!propertyId) {
      setRooms([]);
      // Drop any stale selection if the property went away
      if (selectedIds.length > 0) onChange([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('property_rooms')
          .select('id, name, room_type, size_sqm')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: true });
        if (error) throw new Error(error.message);
        if (!cancelled) setRooms((data ?? []) as PropertyRoomSummary[]);
      } catch (e) {
        logger.warn('RoomScopePicker: load failed', e);
        if (!cancelled) setRooms([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  // Trim selection when underlying rooms list changes
  useEffect(() => {
    if (selectedIds.length === 0) return;
    const valid = new Set(rooms.map((r) => r.id));
    const filtered = selectedIds.filter((id) => valid.has(id));
    if (filtered.length !== selectedIds.length) onChange(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]);

  if (!propertyId) return null;

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  const totalSqm = rooms
    .filter((r) => selectedIds.includes(r.id))
    .reduce<number>((sum, r) => sum + (r.size_sqm ?? 0), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Which rooms? <Text style={styles.labelHint}>(optional)</Text>
      </Text>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={me.brand} />
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No rooms defined on this property yet. You can still post the job —
            add rooms on the property to enable per-room quoting next time.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.hint}>
            Tap each room the contractor will work in.
          </Text>
          <View style={styles.grid}>
            {rooms.map((room) => {
              const active = selectedIds.includes(room.id);
              return (
                <TouchableOpacity
                  key={room.id}
                  onPress={() => toggle(room.id)}
                  accessibilityRole='button'
                  accessibilityState={{ selected: active }}
                  style={[styles.tile, active && styles.tileActive]}
                >
                  <Text style={styles.tileType}>
                    {ROOM_TYPE_LABELS[room.room_type] ?? room.room_type}
                  </Text>
                  <Text style={styles.tileName} numberOfLines={1}>
                    {room.name}
                  </Text>
                  <Text style={styles.tileSqm}>
                    {room.size_sqm != null
                      ? `${Number(room.size_sqm).toFixed(1)} m²`
                      : '— m²'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedIds.length > 0 && totalSqm > 0 ? (
            <Text style={styles.summary}>
              {selectedIds.length} room
              {selectedIds.length === 1 ? '' : 's'} · {totalSqm.toFixed(1)} m²
              total
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    marginTop: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: me.ink2,
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  labelHint: {
    fontWeight: '400',
    color: me.ink3,
  },
  hint: {
    fontSize: 12,
    color: me.ink3,
    marginBottom: 10,
  },
  loading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  empty: {
    backgroundColor: me.bg2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: me.line,
    borderRadius: 12,
    padding: 14,
  },
  emptyText: {
    fontSize: 12,
    color: me.ink3,
    lineHeight: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    minWidth: '47%',
    flexGrow: 1,
    flexBasis: '47%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: me.radius.card,
    borderWidth: 1.5,
    borderColor: me.line,
    backgroundColor: me.surface,
  },
  tileActive: {
    borderColor: me.brand,
    backgroundColor: me.brandSoft,
  },
  tileType: {
    fontSize: 10,
    color: me.ink3,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tileName: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
    marginTop: 2,
  },
  tileSqm: {
    fontSize: 12,
    color: me.ink2,
    marginTop: 2,
  },
  summary: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: me.ink2,
  },
});
