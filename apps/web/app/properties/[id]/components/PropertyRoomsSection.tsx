'use client';

/**
 * PropertyRoomsSection — list + manage rooms for a property.
 *
 * Self-contained: fetches its own data from /api/properties/[id]/rooms
 * so it can be dropped into the property edit page, property view
 * page, or any other surface that has the property id.
 *
 * Real data only. When the rooms list is empty, a polite empty state
 * invites the homeowner to add one. Sizes are optional and render
 * as "—" when not supplied.
 */

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Ruler, Home as HomeIcon } from 'lucide-react';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { logger } from '@mintenance/shared';
import { RoomFormModal, type RoomFormValues } from './RoomFormModal';

export type RoomType =
  | 'kitchen'
  | 'bathroom'
  | 'bedroom'
  | 'living_room'
  | 'dining_room'
  | 'garage'
  | 'garden'
  | 'exterior'
  | 'roof'
  | 'hallway'
  | 'office'
  | 'utility'
  | 'other';

export interface PropertyRoom {
  id: string;
  name: string;
  room_type: RoomType;
  size_sqm: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PropertyRoomsSectionProps {
  propertyId: string;
  /** Set to true on edit page; false on read-only view (hides Add/Edit/Delete). */
  editable?: boolean;
}

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
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

export function PropertyRoomsSection({
  propertyId,
  editable = false,
}: PropertyRoomsSectionProps) {
  const { getCsrfHeaders } = useCSRF();
  const [rooms, setRooms] = useState<PropertyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<PropertyRoom | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/properties/${propertyId}/rooms`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to load rooms (${res.status})`);
      const json = await res.json();
      setRooms(json.rooms ?? []);
    } catch (e) {
      logger.error('PropertyRoomsSection: load failed', e, { service: 'ui' });
      setError(e instanceof Error ? e.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const handleSave = async (values: RoomFormValues) => {
    setSaving(true);
    try {
      const isEdit = !!editingRoom;
      const url = isEdit
        ? `/api/properties/${propertyId}/rooms/${editingRoom!.id}`
        : `/api/properties/${propertyId}/rooms`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          name: values.name,
          room_type: values.room_type,
          size_sqm:
            values.size_sqm === '' || values.size_sqm == null
              ? null
              : Number(values.size_sqm),
          notes: values.notes?.trim() ? values.notes.trim() : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || data.message || `Save failed (${res.status})`
        );
      }
      setModalOpen(false);
      setEditingRoom(null);
      await fetchRooms();
    } catch (e) {
      logger.error('PropertyRoomsSection: save failed', e, { service: 'ui' });
      setError(e instanceof Error ? e.message : 'Failed to save room');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room: PropertyRoom) => {
    if (
      !window.confirm(`Delete the room "${room.name}"? This cannot be undone.`)
    ) {
      return;
    }
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/rooms/${room.id}`,
        {
          method: 'DELETE',
          headers: { ...getCsrfHeaders() },
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      await fetchRooms();
    } catch (e) {
      logger.error('PropertyRoomsSection: delete failed', e, { service: 'ui' });
      setError(e instanceof Error ? e.message : 'Failed to delete room');
    }
  };

  return (
    <section
      style={{
        background: 'var(--me-surface)',
        borderRadius: 14,
        border: '1px solid var(--me-line)',
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--me-font-display, "Inter", sans-serif)',
              fontSize: 24,
              color: 'var(--me-ink)',
              letterSpacing: 'var(--me-display-tracking, -0.012em)',
            }}
          >
            Rooms
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: 'var(--me-ink-3)',
              maxWidth: 520,
            }}
          >
            Define each room and its size so jobs can target the right area and
            contractors can quote accurate per-square-metre prices.
          </p>
        </div>
        {editable ? (
          <button
            type='button'
            onClick={() => {
              setEditingRoom(null);
              setModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 'var(--me-radius-btn, 10px)',
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} strokeWidth={2} /> Add room
          </button>
        ) : null}
      </div>

      {error ? (
        <div
          style={{
            background: 'var(--me-err-bg)',
            color: 'var(--me-err-fg)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: 'var(--me-ink-3)',
            fontSize: 13,
          }}
        >
          Loading rooms…
        </div>
      ) : rooms.length === 0 ? (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            border: '1px dashed var(--me-line)',
            borderRadius: 12,
            background: 'var(--me-bg)',
          }}
        >
          <HomeIcon
            size={28}
            strokeWidth={1.5}
            color='var(--me-ink-4)'
            style={{ marginBottom: 8 }}
          />
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--me-ink)',
            }}
          >
            No rooms added yet
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 12,
              color: 'var(--me-ink-3)',
            }}
          >
            {editable
              ? 'Add rooms so jobs can target a specific area.'
              : 'The homeowner has not added room details for this property.'}
          </p>
        </div>
      ) : (
        <div
          role='list'
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {rooms.map((room) => (
            <div
              key={room.id}
              role='listitem'
              style={{
                padding: 14,
                borderRadius: 12,
                background: 'var(--me-bg)',
                border: '1px solid var(--me-line-2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: 'var(--me-ink-3)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      fontWeight: 600,
                    }}
                  >
                    {ROOM_TYPE_LABELS[room.room_type]}
                  </p>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--me-ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {room.name}
                  </p>
                </div>
                {editable ? (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button
                      type='button'
                      aria-label='Edit room'
                      onClick={() => {
                        setEditingRoom(room);
                        setModalOpen(true);
                      }}
                      style={{
                        padding: 6,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--me-ink-3)',
                        borderRadius: 6,
                      }}
                    >
                      <Pencil size={14} strokeWidth={1.75} />
                    </button>
                    <button
                      type='button'
                      aria-label='Delete room'
                      onClick={() => void handleDelete(room)}
                      style={{
                        padding: 6,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--me-err-fg)',
                        borderRadius: 6,
                      }}
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  color: 'var(--me-ink-2)',
                }}
              >
                <Ruler size={12} strokeWidth={1.75} />
                {room.size_sqm != null
                  ? `${Number(room.size_sqm).toFixed(1)} m²`
                  : '— m²'}
              </div>

              {room.notes ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: 'var(--me-ink-3)',
                    lineHeight: 1.4,
                  }}
                >
                  {room.notes}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {modalOpen ? (
        <RoomFormModal
          initial={
            editingRoom
              ? {
                  name: editingRoom.name,
                  room_type: editingRoom.room_type,
                  size_sqm:
                    editingRoom.size_sqm != null
                      ? String(editingRoom.size_sqm)
                      : '',
                  notes: editingRoom.notes ?? '',
                }
              : undefined
          }
          saving={saving}
          onCancel={() => {
            setModalOpen(false);
            setEditingRoom(null);
          }}
          onSubmit={handleSave}
        />
      ) : null}
    </section>
  );
}
