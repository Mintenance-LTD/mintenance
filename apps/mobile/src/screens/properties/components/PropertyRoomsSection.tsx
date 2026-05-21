/**
 * PropertyRoomsSection (mobile)
 *
 * Mobile parity for the web /properties/[id] rooms section.
 * Lists rooms for a property, lets the owner add/edit/delete via a
 * modal, and persists straight through the supabase client — RLS on
 * `property_rooms` enforces ownership (see
 * supabase/migrations/20260520020000_property_rooms.sql).
 *
 * Real-data-only: empty list shows an empty state; size_sqm shows
 * "—" when not provided rather than fabricating a value.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import { supabase } from '../../../config/supabase';
import { logger } from '../../../utils/logger';
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
  property_id: string;
  name: string;
  room_type: RoomType;
  size_sqm: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
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

interface PropertyRoomsSectionProps {
  propertyId: string;
  editable?: boolean;
}

export const PropertyRoomsSection: React.FC<PropertyRoomsSectionProps> = ({
  propertyId,
  editable = false,
}) => {
  const [rooms, setRooms] = useState<PropertyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<PropertyRoom | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('property_rooms')
        .select(
          'id, property_id, name, room_type, size_sqm, notes, created_at, updated_at'
        )
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true });
      if (fetchError) throw new Error(fetchError.message);
      setRooms((data ?? []) as PropertyRoom[]);
    } catch (e) {
      logger.error('PropertyRoomsSection: load failed', e);
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
      const payload = {
        name: values.name.trim(),
        room_type: values.room_type,
        size_sqm:
          values.size_sqm === '' || values.size_sqm == null
            ? null
            : Number(values.size_sqm),
        notes: values.notes.trim() ? values.notes.trim() : null,
      };
      if (editingRoom) {
        const { error: updateError } = await supabase
          .from('property_rooms')
          .update(payload)
          .eq('id', editingRoom.id)
          .eq('property_id', propertyId);
        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await supabase
          .from('property_rooms')
          .insert({ ...payload, property_id: propertyId });
        if (insertError) throw new Error(insertError.message);
      }
      setModalVisible(false);
      setEditingRoom(null);
      await fetchRooms();
    } catch (e) {
      logger.error('PropertyRoomsSection: save failed', e);
      Alert.alert(
        'Save failed',
        e instanceof Error ? e.message : 'Could not save room'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (room: PropertyRoom) => {
    Alert.alert(
      'Delete room?',
      `"${room.name}" will be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: deleteError } = await supabase
                .from('property_rooms')
                .delete()
                .eq('id', room.id)
                .eq('property_id', propertyId);
              if (deleteError) throw new Error(deleteError.message);
              await fetchRooms();
            } catch (e) {
              logger.error('PropertyRoomsSection: delete failed', e);
              Alert.alert(
                'Delete failed',
                e instanceof Error ? e.message : 'Could not delete room'
              );
            }
          },
        },
      ]
    );
  };

  const sortedRooms = useMemo(() => rooms, [rooms]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>ROOMS</Text>
        {editable ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setEditingRoom(null);
              setModalVisible(true);
            }}
            accessibilityLabel='Add a room'
          >
            <Ionicons name='add' size={16} color={me.onBrand} />
            <Text style={styles.addBtnText}>Add room</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={me.brand} />
          <Text style={styles.loadingText}>Loading rooms…</Text>
        </View>
      ) : sortedRooms.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name='home-outline'
            size={24}
            color={me.ink4}
            style={{ marginBottom: 6 }}
          />
          <Text style={styles.emptyTitle}>No rooms added yet</Text>
          <Text style={styles.emptySub}>
            {editable
              ? 'Add rooms so jobs can target a specific area and contractors can quote per-sqm.'
              : 'The homeowner has not added room details for this property.'}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sortedRooms.map((room) => (
            <View key={room.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowType}>
                  {ROOM_TYPE_LABELS[room.room_type]}
                </Text>
                <Text style={styles.rowName} numberOfLines={1}>
                  {room.name}
                </Text>
                <View style={styles.rowMeta}>
                  <Ionicons
                    name='resize-outline'
                    size={12}
                    color={me.ink3}
                  />
                  <Text style={styles.rowMetaText}>
                    {room.size_sqm != null
                      ? `${Number(room.size_sqm).toFixed(1)} m²`
                      : '— m²'}
                  </Text>
                </View>
                {room.notes ? (
                  <Text style={styles.rowNotes} numberOfLines={2}>
                    {room.notes}
                  </Text>
                ) : null}
              </View>
              {editable ? (
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingRoom(room);
                      setModalVisible(true);
                    }}
                    accessibilityLabel={`Edit ${room.name}`}
                    style={styles.iconBtn}
                  >
                    <Ionicons
                      name='create-outline'
                      size={18}
                      color={me.ink3}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(room)}
                    accessibilityLabel={`Delete ${room.name}`}
                    style={styles.iconBtn}
                  >
                    <Ionicons
                      name='trash-outline'
                      size={18}
                      color={me.errFg}
                    />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {modalVisible ? (
        <RoomFormModal
          visible={modalVisible}
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
            setModalVisible(false);
            setEditingRoom(null);
          }}
          onSubmit={handleSave}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: me.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: me.line,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    letterSpacing: 0.8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: me.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  addBtnText: {
    color: me.onBrand,
    fontSize: 12,
    fontWeight: '700',
  },
  loading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 6,
    color: me.ink3,
    fontSize: 12,
  },
  errorBox: {
    backgroundColor: me.errBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    color: me.errFg,
    fontSize: 12,
  },
  empty: {
    backgroundColor: me.bg2,
    borderWidth: 1,
    borderColor: me.line,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: me.ink,
  },
  emptySub: {
    marginTop: 4,
    fontSize: 12,
    color: me.ink3,
    textAlign: 'center',
    lineHeight: 16,
  },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowType: {
    fontSize: 11,
    color: me.ink3,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
    marginTop: 2,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  rowMetaText: { fontSize: 13, color: me.ink2 },
  rowNotes: {
    marginTop: 4,
    fontSize: 12,
    color: me.ink3,
    lineHeight: 16,
  },
  rowActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
});
