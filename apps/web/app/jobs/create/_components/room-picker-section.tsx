'use client';

/**
 * RoomPickerSection — Property Rooms Slice 1
 *
 * Optional room scope picker, extracted from details-step.tsx to keep
 * the parent under the 500-line budget. Fetches /api/properties/[id]/rooms
 * when a property is selected and lets the homeowner toggle which
 * rooms this job targets.
 *
 * Soft-fail: if the fetch errors the picker simply doesn't render —
 * the rest of the form is unaffected. Empty state ("no rooms yet")
 * is shown only when the property has zero rooms.
 */

import React, { useEffect } from 'react';
import { logger } from '@mintenance/shared';

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

export interface PropertyRoomSummary {
  id: string;
  name: string;
  room_type: string;
  size_sqm: number | null;
}

interface RoomPickerSectionProps {
  propertyId: string | undefined;
  selectedIds: string[];
  onChange: (next: string[]) => void;
  sectionLabelStyle: React.CSSProperties;
}

export function useRoomPicker(propertyId: string | undefined) {
  const [rooms, setRooms] = React.useState<PropertyRoomSummary[]>([]);
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (!propertyId) {
      setRooms([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/properties/${propertyId}/rooms`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`Failed to load rooms (${res.status})`);
        const json = await res.json();
        if (!cancelled) {
          setRooms((json.rooms ?? []) as PropertyRoomSummary[]);
        }
      } catch (e) {
        logger.warn('Job-create room picker: load failed', {
          service: 'app',
          error: e instanceof Error ? e.message : String(e),
        });
        if (!cancelled) setRooms([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  return { rooms, loading };
}

export function RoomPickerSection({
  propertyId,
  selectedIds,
  onChange,
  sectionLabelStyle,
}: RoomPickerSectionProps) {
  const { rooms, loading } = useRoomPicker(propertyId);

  // Trim selection when underlying rooms list changes.
  useEffect(() => {
    if (selectedIds.length === 0) return;
    const valid = new Set(rooms.map((r) => r.id));
    const filtered = selectedIds.filter((id) => valid.has(id));
    if (filtered.length !== selectedIds.length) onChange(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]);

  if (!propertyId || loading) return null;

  const selected = new Set(selectedIds);
  const toggleRoom = (roomId: string) => {
    const next = selected.has(roomId)
      ? selectedIds.filter((id) => id !== roomId)
      : [...selectedIds, roomId];
    onChange(next);
  };
  const totalSelectedSqm = rooms
    .filter((r) => selected.has(r.id))
    .reduce<number>((sum, r) => sum + (r.size_sqm ?? 0), 0);

  if (rooms.length === 0) {
    return (
      <div>
        <span style={sectionLabelStyle}>
          Rooms{' '}
          <span style={{ color: 'var(--me-ink-3)', fontWeight: 400 }}>
            (optional)
          </span>
        </span>
        <div
          style={{
            padding: 14,
            border: '1px dashed var(--me-line)',
            borderRadius: 'var(--me-radius-card)',
            background: 'var(--me-bg)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--me-ink-2)',
            }}
          >
            No rooms defined on this property yet. You can still post the job —
            add rooms on the property page later to enable per-room quoting for
            future work.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <span style={sectionLabelStyle}>
        Which rooms does this job involve?{' '}
        <span style={{ color: 'var(--me-ink-3)', fontWeight: 400 }}>
          (optional)
        </span>
      </span>
      <p
        style={{
          margin: '0 0 12px',
          fontSize: 13,
          color: 'var(--me-ink-3)',
        }}
      >
        Tap each room the contractor will work in. Sizes you&rsquo;ve added on
        the property will help them quote per square metre.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 10,
        }}
      >
        {rooms.map((room) => {
          const active = selected.has(room.id);
          return (
            <button
              key={room.id}
              type='button'
              onClick={() => toggleRoom(room.id)}
              style={{
                textAlign: 'left',
                padding: 12,
                borderRadius: 'var(--me-radius-card)',
                border: `1.5px solid ${
                  active ? 'var(--me-brand)' : 'var(--me-line)'
                }`,
                background: active
                  ? 'var(--me-brand-soft)'
                  : 'var(--me-surface)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
              aria-pressed={active}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--me-ink-3)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {ROOM_TYPE_LABELS[room.room_type] ?? room.room_type}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--me-ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {room.name}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--me-ink-2)',
                }}
              >
                {room.size_sqm != null
                  ? `${Number(room.size_sqm).toFixed(1)} m²`
                  : '— m²'}
              </span>
            </button>
          );
        })}
      </div>
      {selected.size > 0 && totalSelectedSqm > 0 ? (
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 12,
            color: 'var(--me-ink-2)',
          }}
        >
          {selected.size} room{selected.size === 1 ? '' : 's'} selected ·{' '}
          {totalSelectedSqm.toFixed(1)} m² total
        </p>
      ) : null}
    </div>
  );
}
