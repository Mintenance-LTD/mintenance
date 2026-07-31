'use client';

/**
 * RoomsScopeCard — Property Rooms Slice 3 (web contractor)
 *
 * Read-only sidebar card listing the rooms the assigned contractor
 * is working in. Renders nothing for legacy jobs without room scope
 * (no homeowner picker was used) so the sidebar layout is unchanged.
 *
 * Data source: GET /api/jobs/[id]/rooms (RLS-gated to the assigned
 * contractor + homeowner + posted/published-job readers).
 */

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card.unified';
import { theme } from '@/lib/theme';
import { Ruler } from 'lucide-react';
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

interface RoomRow {
  id: string;
  property_room_id: string | null;
  name: string;
  room_type: string;
  size_sqm_at_post: number | null;
}

export function RoomsScopeCard({ jobId }: { jobId: string }) {
  const [rooms, setRooms] = useState<RoomRow[]>([]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/rooms`, {
          credentials: 'include',
        });
        if (!res.ok) return; // quietly hide on 4xx
        const json = await res.json();
        if (!cancelled) setRooms((json.rooms ?? []) as RoomRow[]);
      } catch (e) {
        logger.warn('RoomsScopeCard: load failed', {
          service: 'ui',
          error: e instanceof Error ? e.message : String(e),
        });
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
    <Card padding='lg' hover={false}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: theme.spacing[3],
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}
        >
          Rooms in scope
        </h3>
        {anySized && totalSqm > 0 ? (
          <span
            style={{
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textSecondary,
            }}
          >
            {totalSqm.toFixed(1)} m² total
          </span>
        ) : null}
      </div>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[2],
        }}
      >
        {rooms.map((r) => (
          <li
            key={r.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: theme.spacing[3],
              padding: theme.spacing[2],
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  fontWeight: theme.typography.fontWeight.semibold,
                }}
              >
                {ROOM_TYPE_LABELS[r.room_type] ?? r.room_type}
              </div>
              <div
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.textPrimary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.name}
              </div>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                flexShrink: 0,
              }}
            >
              <Ruler className='h-3 w-3' />
              {r.size_sqm_at_post != null
                ? `${Number(r.size_sqm_at_post).toFixed(1)} m²`
                : '— m²'}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
