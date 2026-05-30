/**
 * CalendarScreen — Mint Editorial redesign per redesign-v2
 * contractor business deck screen 07 "Calendar".
 *
 * Layout:
 *   1. Lightweight back nav + serif "Calendar" header with
 *      "Wk N · <Month YYYY>" sub.
 *   2. Week strip: Mon–Sun with day initials above, dates below, a
 *      dot-density indicator underneath (1 dot for 1–2 events, 2 for
 *      3–4, 3 for 5+). Selected day is a dark filled chip.
 *   3. Day eyebrow ("WED 15 MAY · 3 JOBS").
 *   4. Timeline-style agenda: left vertical rail with coloured nodes,
 *      time + duration eyebrow, bordered job card per event.
 *
 * The previous green-gradient hero + multi-color event-dot row +
 * stats pill row are retired — too visually loud for the editorial
 * direction, and the dot density alone reads more cleanly.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient } from '../utils/mobileApiClient';
import { goToTab } from '../navigation/hooks';
import { me } from '../design-system/mint-editorial';
import { styles } from './CalendarStyles';

interface ScheduleItem {
  id: string;
  // 2026-05-25 audit-43 P2: job_id is optional now. Previously fell
  // back to the appointment id when the appointment wasn't job-linked,
  // and tapping then navigated to JobDetails with a non-job id which
  // surfaced as "job not found". Null means "standalone appointment —
  // don't navigate to JobDetails".
  job_id: string | null;
  job_title: string;
  date: string; // YYYY-MM-DD
  time_start: string; // HH:MM
  time_end?: string;
  duration_minutes?: number;
  status: string;
  address?: string;
}

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'Calendar'>;
}

const WEEKDAY_INITIALS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDays(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  const dow = start.getDay(); // 0 = Sun
  const offsetToMonday = (dow + 6) % 7;
  start.setDate(start.getDate() - offsetToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isoWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function durationLabel(start: string, end?: string): string {
  if (!end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return '';
  const minutes = ((eh ?? 0) - (sh ?? 0)) * 60 + ((em ?? 0) - (sm ?? 0));
  if (minutes <= 0) return '';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Density of events on a day → number of dots under the day cell.
function dotsFor(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  return 3;
}

export const CalendarScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekDays = useMemo(
    () => getWeekDays(selectedDate),
    [selectedDate.toISOString().slice(0, 10)]
  );
  const selectedDateKey = toDateKey(selectedDate);

  const {
    data: schedule,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contractor-schedule', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // 2026-05-23 audit-21 P1: was hitting /api/contractor/appointments
      // which is contractor-role-gated; homeowners 403'd. The
      // role-agnostic /api/appointments (now with daysAhead + limit
      // params per the matching route change) handles both sides and
      // filters on contractor_id for contractors, client_id for
      // homeowners. We pass a generous limit so the 180-day calendar
      // still shows the full set instead of the 10-row default the
      // dashboard widget uses.
      const res = await mobileApiClient.get<{
        appointments: Array<{
          id: string;
          title: string;
          date: string;
          time: string;
          endTime?: string;
          status?: string;
          locationAddress?: string;
          job?: { id: string; title?: string } | null;
          // Older contractor-route shape, kept for backward compatibility
          jobId?: string;
          jobTitle?: string;
          location?: string;
        }>;
      }>('/api/appointments?daysAhead=180&limit=500');

      return (res.appointments || []).map(
        (a): ScheduleItem => ({
          id: a.id,
          // 2026-05-25 audit-43 P2: stop using the appointment id as a
          // jobId fallback. A standalone appointment (no job link) has
          // job?.id and jobId both undefined; defaulting to a.id meant
          // tapping the event navigated to JobDetails with that
          // non-existent jobId. Now null → press handler skips nav.
          job_id: a.job?.id || a.jobId || null,
          job_title: a.job?.title || a.jobTitle || a.title || 'Untitled',
          date: a.date,
          time_start: a.time || '09:00',
          time_end: a.endTime,
          status: a.status || 'scheduled',
          address: a.locationAddress || a.location,
        })
      );
    },
    enabled: !!user?.id,
    retry: 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    placeholderData: (prev: ScheduleItem[] | undefined) => prev,
  });

  const filteredSchedule = useMemo(() => {
    if (!schedule) return [];
    return schedule
      .filter((item) => item.date === selectedDateKey)
      .sort((a, b) => a.time_start.localeCompare(b.time_start));
  }, [schedule, selectedDateKey]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    schedule?.forEach((item) => {
      map[item.date] = (map[item.date] || 0) + 1;
    });
    return map;
  }, [schedule]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const monthYear = selectedDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
  const headerSub = `Wk ${isoWeek(selectedDate)} · ${monthYear}`;
  const dayEyebrow = `${selectedDate.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()} ${selectedDate.getDate()} ${selectedDate.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()} · ${filteredSchedule.length} ${filteredSchedule.length === 1 ? 'JOB' : 'JOBS'}`;

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor='transparent'
        barStyle='dark-content'
      />

      <View style={[styles.topNav, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='arrow-back' size={20} color={me.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.todayPill}
          onPress={() => setSelectedDate(new Date())}
          accessibilityRole='button'
          accessibilityLabel='Jump to today'
        >
          <Text style={styles.todayPillText}>Today</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.screenHeader}>
        <Text style={styles.eyebrow}>Calendar</Text>
        <Text style={styles.headline}>Calendar</Text>
        <Text style={styles.sub}>{headerSub}</Text>
      </View>

      <View style={styles.weekRow}>
        {weekDays.map((day, idx) => {
          const key = toDateKey(day);
          const isSel = key === selectedDateKey;
          const isTod = isToday(day);
          const count = eventsByDate[key] ?? 0;
          const nDots = dotsFor(count);

          return (
            <TouchableOpacity
              key={key}
              style={styles.dayCol}
              onPress={() => setSelectedDate(day)}
              accessibilityRole='button'
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={`${WEEKDAY_INITIALS[idx]} ${day.getDate()}, ${count} ${count === 1 ? 'event' : 'events'}`}
            >
              <Text style={[styles.dayName, isSel && styles.dayNameSelected]}>
                {WEEKDAY_INITIALS[idx]}
              </Text>
              <View
                style={[
                  styles.dayNumberChip,
                  isSel && styles.dayNumberChipSelected,
                  isTod && !isSel && styles.dayNumberChipToday,
                ]}
              >
                <Text
                  style={[styles.dayNumber, isSel && styles.dayNumberSelected]}
                >
                  {day.getDate()}
                </Text>
              </View>
              <View style={styles.dotsRow}>
                {Array.from({ length: nDots }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      isSel ? styles.dotSelected : styles.dotIdle,
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.dayEyebrow}>{dayEyebrow}</Text>

      {isLoading ? (
        <View style={styles.centeredState}>
          <Ionicons name='calendar-outline' size={28} color={me.brand} />
          <Text style={styles.stateTitle}>Loading schedule…</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredState}>
          <Ionicons name='warning-outline' size={28} color={me.errFg} />
          <Text style={styles.stateTitle}>Failed to load schedule</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredSchedule.length === 0 ? (
        <View style={styles.centeredState}>
          <Ionicons name='calendar-clear-outline' size={28} color={me.brand} />
          <Text style={styles.stateTitle}>No events</Text>
          <Text style={styles.stateSubtitle}>
            Your day is clear. Time to line up the next job.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() =>
              goToTab(navigation, 'JobsTab', { screen: 'JobsList' })
            }
          >
            <Text style={styles.browseButtonText}>Browse jobs →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredSchedule}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const dur = durationLabel(item.time_start, item.time_end);
            // Cycle node colours so the timeline doesn't look monotonous.
            const palette = [me.brand, me.warnFg, me.infoFg];
            const nodeColor = palette[index % palette.length] ?? me.brand;
            return (
              <View style={styles.row}>
                <View style={styles.railCol}>
                  <View
                    style={[styles.railNode, { backgroundColor: nodeColor }]}
                  />
                  {index < filteredSchedule.length - 1 && (
                    <View style={styles.railLine} />
                  )}
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowEyebrow}>
                    {item.time_start}
                    {dur ? ` · ${dur}` : ''}
                  </Text>
                  <TouchableOpacity
                    style={[styles.eventCard, { borderLeftColor: nodeColor }]}
                    onPress={() => {
                      // 2026-05-25 audit-43 P2: standalone appointments
                      // (no job link) shouldn't pretend to be jobs.
                      // Tap is a no-op for now — there's no dedicated
                      // AppointmentDetail screen on mobile yet, but at
                      // least we no longer navigate to a JobDetails
                      // with a non-job id and surface "Job not found".
                      if (!item.job_id) return;
                      goToTab(navigation, 'JobsTab', {
                        screen: 'JobDetails',
                        params: { jobId: item.job_id },
                      });
                    }}
                    disabled={!item.job_id}
                    accessibilityRole='button'
                    accessibilityLabel={`${item.job_title} at ${item.time_start}`}
                  >
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {item.job_title}
                    </Text>
                    {item.address ? (
                      <View style={styles.eventMetaRow}>
                        <Ionicons
                          name='location-outline'
                          size={11}
                          color={me.ink3}
                        />
                        <Text style={styles.eventMeta} numberOfLines={1}>
                          {item.address}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={me.brand}
              colors={[me.brand]}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default CalendarScreen;
