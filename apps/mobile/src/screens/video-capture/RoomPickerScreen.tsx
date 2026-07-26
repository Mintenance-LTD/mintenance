/**
 * Pick the room to film before the recorder opens.
 *
 * The walkthrough used to be one 60-second take of a whole property, driven by
 * a fixed exterior→interior→damage→recap script on a timer. It could not know
 * where the person was standing, so it told someone filming their kitchen to
 * "pan across the front facade".
 *
 * Choosing a room first fixes that: the guidance can name real things to point
 * at, the clip is short enough to stay sharp, and a shaky room costs only that
 * room instead of the whole survey.
 *
 * Most properties have no `property_rooms` rows — the add-property form
 * collects bedroom and bathroom COUNTS and nothing ever turns them into rooms.
 * When the list is empty this offers to do exactly that rather than dead-ending
 * on "no rooms yet".
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { logger } from '@mintenance/shared';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { me } from '../../design-system/mint-editorial';

interface Room {
  id: string;
  name: string;
  room_type: string;
}

interface Props {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route: {
    params: {
      propertyId: string;
      propertyName?: string;
      /**
       * Forwarded straight through to the recorder. The assessment wizard
       * passes a callback so it can tick its walkthrough step; this screen
       * sits between the two and must not swallow it.
       */
      onComplete?: (assessmentId: string) => void;
    };
  };
}

/** Material icon per room type, falling back to a generic room. */
const ROOM_ICON: Record<string, string> = {
  kitchen: 'countertops',
  bathroom: 'bathtub',
  bedroom: 'bed',
  living_room: 'weekend',
  dining_room: 'dining',
  garage: 'garage',
  garden: 'yard',
  exterior: 'home',
  roof: 'roofing',
  hallway: 'door-front',
  office: 'desk',
  utility: 'local-laundry-service',
  other: 'meeting-room',
};

export const RoomPickerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { propertyId, propertyName, onComplete } = route.params;

  const [rooms, setRooms] = useState<Room[]>([]);
  // null = not loaded yet, false = loaded, true = the fetch failed. An empty
  // list and a failed load must not look the same.
  const [loadFailed, setLoadFailed] = useState<boolean | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await mobileApiClient.get<{ rooms?: Room[] }>(
        `/api/properties/${propertyId}/rooms`
      );
      setRooms(Array.isArray(res?.rooms) ? res.rooms : []);
      setLoadFailed(false);
    } catch (error) {
      logger.warn('Failed to load rooms for walkthrough', { error });
      setLoadFailed(true);
    }
  }, [propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const seedRooms = async () => {
    setSeeding(true);
    try {
      const res = await mobileApiClient.post<{ rooms?: Room[] }>(
        `/api/properties/${propertyId}/rooms/seed`,
        {}
      );
      setRooms(Array.isArray(res?.rooms) ? res.rooms : []);
      setLoadFailed(false);
    } catch (error) {
      logger.error('Failed to seed rooms', { error });
      setLoadFailed(true);
    } finally {
      setSeeding(false);
    }
  };

  const pickRoom = (room: Room) => {
    navigation.navigate('VideoCapture', {
      propertyId,
      walkthrough: true,
      roomId: room.id,
      roomName: room.name,
      roomType: room.room_type,
      onComplete,
    });
  };

  /**
   * The original whole-property script is still the right tool for an exterior
   * survey, so it stays available — just no longer the only option, and no
   * longer the one you get by accident while standing in a kitchen.
   */
  const filmWholeProperty = () => {
    navigation.navigate('VideoCapture', {
      propertyId,
      walkthrough: true,
      onComplete,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          style={styles.backBtn}
        >
          <Icon name='arrow-back' size={24} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole='header'>
          Which room?
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.lede}>
          Film one room at a time — about 20 seconds each.
          {propertyName ? ` ${propertyName}.` : ''}
        </Text>

        {loadFailed === null && (
          <ActivityIndicator style={styles.spinner} color={me.brand} />
        )}

        {loadFailed === true && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              We couldn&apos;t load this property&apos;s rooms.
            </Text>
            <TouchableOpacity onPress={() => void load()}>
              <Text style={styles.noticeAction}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {loadFailed === false && rooms.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No rooms set up yet</Text>
            <Text style={styles.emptyBody}>
              We can start from the bedroom and bathroom counts on this
              property, plus a kitchen, living room and hallway. You can rename
              or remove any of them afterwards.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, seeding && styles.primaryBtnDisabled]}
              onPress={() => void seedRooms()}
              disabled={seeding}
              accessibilityRole='button'
            >
              <Text style={styles.primaryText}>
                {seeding ? 'Setting up…' : 'Set up rooms'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {rooms.map((room) => (
          <TouchableOpacity
            key={room.id}
            style={styles.roomRow}
            onPress={() => pickRoom(room)}
            accessibilityRole='button'
            accessibilityLabel={`Film ${room.name}`}
          >
            <View style={styles.roomIcon}>
              <Icon
                name={ROOM_ICON[room.room_type] ?? 'meeting-room'}
                size={20}
                color={me.brand2}
              />
            </View>
            <View style={styles.roomMain}>
              <Text style={styles.roomName}>{room.name}</Text>
              <Text style={styles.roomType}>
                {room.room_type.replace(/_/g, ' ')}
              </Text>
            </View>
            <Icon name='chevron-right' size={22} color={me.ink4} />
          </TouchableOpacity>
        ))}

        {loadFailed === false && (
          <TouchableOpacity
            style={styles.wholeProperty}
            onPress={filmWholeProperty}
            accessibilityRole='button'
          >
            <Text style={styles.wholePropertyText}>
              Film the whole property instead
            </Text>
            <Text style={styles.wholePropertyHint}>
              One 60-second pass, starting outside
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: me.ink },
  scroll: { padding: 16, paddingBottom: 40 },
  lede: { fontSize: 14, color: me.ink2, marginBottom: 16 },
  spinner: { marginTop: 24 },
  notice: {
    backgroundColor: me.warnBg,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  noticeText: { fontSize: 13, color: me.warnFg },
  noticeAction: { fontSize: 13, fontWeight: '700', color: me.warnFg },
  empty: {
    backgroundColor: me.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: me.line,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 6,
  },
  emptyBody: { fontSize: 13, color: me.ink3, lineHeight: 19, marginBottom: 14 },
  primaryBtn: {
    backgroundColor: me.brand,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryText: { color: me.onBrand, fontSize: 14, fontWeight: '600' },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: me.line,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  roomIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roomMain: { flex: 1 },
  roomName: { fontSize: 15, fontWeight: '600', color: me.ink },
  roomType: { fontSize: 12, color: me.ink3, textTransform: 'capitalize' },
  wholeProperty: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  wholePropertyText: { fontSize: 14, fontWeight: '600', color: me.brand2 },
  wholePropertyHint: { fontSize: 12, color: me.ink3, marginTop: 2 },
});
