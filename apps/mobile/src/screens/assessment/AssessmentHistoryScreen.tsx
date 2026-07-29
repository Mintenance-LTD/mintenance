/**
 * Past surveys for a property.
 *
 * Surveys were being saved all along — building_assessments has had rows since
 * the walkthrough shipped — but mobile had no way to look at one again. A
 * survey was view-once: close the result screen and it was gone, which made a
 * saved record feel like a lost one.
 *
 * Optionally scoped to a single room, so "what has happened in this kitchen"
 * is answerable from the room picker.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @expo/vector-icons, not react-native-vector-icons: the latter is imported by
// ~10 older screens but is absent from package.json, the lockfile and disk —
// only a hand-written `declare module` shim in src/types/modules.d.ts keeps tsc
// quiet about it. @expo/vector-icons is the installed package.
import { Ionicons } from '@expo/vector-icons';
import { logger } from '@mintenance/shared';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { me } from '../../design-system/mint-editorial';

interface AssessmentRow {
  id: string;
  damageType: string | null;
  severity: string | null;
  confidence: number | null;
  urgency: string | null;
  createdAt: string | null;
  thumbnailUrl: string | null;
  needsOnsiteInspection?: boolean;
  room: { id: string; name: string | null; type: string | null } | null;
}

interface Props {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route: {
    params: {
      propertyId: string;
      /** Narrow the list to one room. */
      roomId?: string;
      roomName?: string;
    };
  };
}

/** Matches the roll-up's threshold so the two surfaces agree. */
const NEEDS_ATTENTION = new Set(['significant', 'dangerous']);

const SEVERITY_STYLE: Record<string, { bg: string; fg: string }> = {
  early: { bg: me.okBg, fg: me.okFg },
  developing: { bg: me.warnBg, fg: me.warnFg },
  significant: { bg: me.errBg, fg: me.errFg },
  dangerous: { bg: me.errBg, fg: me.errFg },
};

function formatDate(iso: string | null): string {
  if (!iso) return 'Unknown date';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 'Unknown date';
  return new Date(t).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const AssessmentHistoryScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { propertyId, roomId, roomName } = route.params;

  const [rows, setRows] = useState<AssessmentRow[]>([]);
  // null = first load, false = loaded, true = failed. An empty history and a
  // failed fetch must not look the same.
  const [loadFailed, setLoadFailed] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const query = roomId ? `?roomId=${encodeURIComponent(roomId)}` : '';
      const res = await mobileApiClient.get<{ assessments?: AssessmentRow[] }>(
        `/api/properties/${propertyId}/assessments${query}`
      );
      setRows(Array.isArray(res?.assessments) ? res.assessments : []);
      setLoadFailed(false);
    } catch (error) {
      logger.warn('Failed to load assessment history', { error });
      setLoadFailed(true);
    }
  }, [propertyId, roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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
          <Ionicons name='arrow-back' size={24} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole='header'>
          {roomName ? `${roomName} surveys` : 'Survey history'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loadFailed === null && (
          <ActivityIndicator style={styles.spinner} color={me.brand} />
        )}

        {loadFailed === true && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              We couldn&apos;t load your past surveys.
            </Text>
            <TouchableOpacity onPress={() => void load()}>
              <Text style={styles.noticeAction}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {loadFailed === false && rows.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No surveys yet</Text>
            <Text style={styles.emptyBody}>
              {roomName
                ? `Film ${roomName} and the survey will appear here.`
                : 'Run an AI walkthrough and its survey will appear here.'}
            </Text>
          </View>
        )}

        {rows.map((row) => {
          const sev = row.severity ?? undefined;
          const style = sev ? SEVERITY_STYLE[sev] : undefined;
          const flagged = sev ? NEEDS_ATTENTION.has(sev) : false;
          return (
            <TouchableOpacity
              key={row.id}
              style={styles.card}
              accessibilityRole='button'
              accessibilityLabel={`Open survey from ${formatDate(row.createdAt)}`}
              onPress={() =>
                navigation.navigate('AssessmentDetail', {
                  assessmentId: row.id,
                  title: row.room?.name ?? undefined,
                })
              }
            >
              {row.thumbnailUrl ? (
                <Image
                  source={{ uri: row.thumbnailUrl }}
                  style={styles.thumb}
                  resizeMode='cover'
                />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}>
                  <Ionicons name='videocam-off' size={18} color={me.ink4} />
                </View>
              )}

              <View style={styles.cardMain}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {row.damageType ?? 'Survey'}
                </Text>
                <Text style={styles.cardMeta}>
                  {formatDate(row.createdAt)}
                  {row.room?.name ? ` · ${row.room.name}` : ''}
                </Text>
                <View style={styles.chipRow}>
                  {sev ? (
                    <View
                      style={[
                        styles.chip,
                        { backgroundColor: style?.bg ?? me.bg2 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: style?.fg ?? me.ink3 },
                        ]}
                      >
                        {sev}
                      </Text>
                    </View>
                  ) : null}
                  {typeof row.confidence === 'number' ? (
                    <Text style={styles.confidence}>
                      {Math.round(row.confidence)}% confidence
                    </Text>
                  ) : null}
                </View>
              </View>

              <Ionicons
                name='chevron-forward'
                size={22}
                color={flagged ? me.errFg : me.ink4}
              />
            </TouchableOpacity>
          );
        })}
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
  spinner: { marginTop: 24 },
  notice: { backgroundColor: me.warnBg, borderRadius: 12, padding: 14, gap: 6 },
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
  emptyBody: { fontSize: 13, color: me.ink3, lineHeight: 19 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: me.line,
    padding: 10,
    marginBottom: 8,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: me.bg2,
    marginRight: 12,
  },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardMain: { flex: 1 },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: me.ink,
    textTransform: 'capitalize',
  },
  cardMeta: { fontSize: 12, color: me.ink3, marginTop: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  confidence: { fontSize: 11, color: me.ink3 },
});
