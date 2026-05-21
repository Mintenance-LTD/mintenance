/**
 * LineItemScopeToolbar — Property Rooms Slice 2 (mobile)
 *
 * Compact per-line-item control allowing the contractor to:
 *   • toggle between "Each" billing and "Per m²" billing
 *   • link the line item to one of the job's scope rooms
 *
 * Self-hides when the job has no room scope (legacy bid UX preserved).
 * When the contractor switches to Per m² + picks a room, the parent
 * is expected to default quantity to that room's snapshotted size.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActionSheetIOS,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

export interface JobRoomScopeOption {
  id: string;
  name: string;
  size_sqm_at_post: number | null;
}

interface LineItemScopeToolbarProps {
  unit: string;
  roomId: string | null | undefined;
  rooms: JobRoomScopeOption[];
  onUnitChange: (unit: 'item' | 'sqm') => void;
  onRoomChange: (roomId: string | null) => void;
}

export const LineItemScopeToolbar: React.FC<LineItemScopeToolbarProps> = ({
  unit,
  roomId,
  rooms,
  onUnitChange,
  onRoomChange,
}) => {
  if (rooms.length === 0) return null;

  const billPerSqm = unit === 'sqm';
  const selectedRoom = rooms.find((r) => r.id === roomId);

  const pickRoom = () => {
    // iOS gets a native action sheet, Android gets a plain Alert list.
    const options = [
      '— No specific room —',
      ...rooms.map((r) =>
        r.size_sqm_at_post != null
          ? `${r.name} (${r.size_sqm_at_post.toFixed(1)} m²)`
          : r.name
      ),
      'Cancel',
    ];
    const cancelIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          title: 'Apply line item to a room',
        },
        (index) => {
          if (index === cancelIndex) return;
          if (index === 0) {
            onRoomChange(null);
            return;
          }
          const room = rooms[index - 1];
          if (room) onRoomChange(room.id);
        }
      );
    } else {
      Alert.alert('Apply line item to a room', undefined, [
        { text: 'No specific room', onPress: () => onRoomChange(null) },
        ...rooms.map((r) => ({
          text:
            r.size_sqm_at_post != null
              ? `${r.name} (${r.size_sqm_at_post.toFixed(1)} m²)`
              : r.name,
          onPress: () => onRoomChange(r.id),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  return (
    <View style={styles.row}>
      <View style={styles.segmented}>
        <TouchableOpacity
          onPress={() => onUnitChange('item')}
          style={[styles.segBtn, !billPerSqm && styles.segBtnActive]}
          accessibilityRole='button'
          accessibilityState={{ selected: !billPerSqm }}
        >
          <Text style={[styles.segText, !billPerSqm && styles.segTextActive]}>
            Each
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onUnitChange('sqm')}
          style={[styles.segBtn, billPerSqm && styles.segBtnActive]}
          accessibilityRole='button'
          accessibilityState={{ selected: billPerSqm }}
        >
          <Ionicons
            name='resize-outline'
            size={12}
            color={billPerSqm ? me.brand : me.ink3}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.segText, billPerSqm && styles.segTextActive]}>
            Per m²
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={pickRoom}
        style={styles.roomBtn}
        accessibilityLabel='Apply line item to a specific room'
      >
        <Ionicons name='home-outline' size={12} color={me.ink2} />
        <Text style={styles.roomText} numberOfLines={1}>
          {selectedRoom?.name ?? 'Room: —'}
        </Text>
        <Ionicons name='chevron-down' size={12} color={me.ink3} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: me.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: me.line,
    padding: 2,
  },
  segBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  segBtnActive: {
    backgroundColor: me.brandSoft,
  },
  segText: {
    fontSize: 11,
    fontWeight: '600',
    color: me.ink3,
  },
  segTextActive: {
    color: me.brand,
  },
  roomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 8,
    maxWidth: 220,
  },
  roomText: {
    fontSize: 11,
    fontWeight: '600',
    color: me.ink2,
    flexShrink: 1,
  },
});
