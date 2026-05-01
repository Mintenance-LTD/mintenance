/**
 * CalendarScreen — Contractor scheduling with weekly calendar strip
 *
 * Full-bleed green gradient hero, green-selected day cells,
 * color-coded event dots, daily stat pills, timeline schedule cards.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient } from '../utils/mobileApiClient';
import { goToTab } from '../navigation/hooks';
import { theme, gradients } from '../theme';
import { styles } from './CalendarStyles';

interface ScheduleItem {
  id: string;
  job_id: string;
  job_title: string;
  date: string;
  time_start: string;
  time_end?: string;
  type: 'job' | 'meeting' | 'deadline';
  status: string;
  address?: string;
}

interface AppointmentsResponse {
  appointments: Array<{
    id: string;
    jobId?: string;
    jobTitle?: string;
    title: string;
    date: string;
    time: string;
    endTime?: string;
    type?: 'job' | 'meeting' | 'deadline' | string;
    status: string;
    location?: string;
  }>;
}

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'Calendar'>;
}

const TYPE_STYLES: Record<
  string,
  {
    color: string;
    bg: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  job: {
    color: theme.colors.primary,
    bg: theme.colors.primaryLight,
    icon: 'hammer-outline',
    label: 'Job',
  },
  meeting: {
    color: '#3B82F6',
    bg: '#DBEAFE',
    icon: 'people-outline',
    label: 'Meeting',
  },
  deadline: {
    color: theme.colors.error,
    bg: '#FEE2E2',
    icon: 'alarm-outline',
    label: 'Deadline',
  },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDays(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
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

// ─── Schedule Card ──────────────────────────────────────────────
const ScheduleCard: React.FC<{
  item: ScheduleItem;
  onPress: () => void;
}> = ({ item, onPress }) => {
  const typeStyle = TYPE_STYLES[item.type] || {
    color: theme.colors.textSecondary,
    bg: theme.colors.backgroundTertiary,
    icon: 'calendar-outline' as const,
    label: 'Event',
  };

  return (
    <TouchableOpacity
      style={styles.scheduleCard}
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={`${typeStyle.label}: ${item.job_title} at ${item.time_start}`}
      activeOpacity={0.7}
    >
      {/* Color accent bar */}
      <View style={[styles.accentBar, { backgroundColor: typeStyle.color }]} />

      <View style={styles.cardInner}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTitleArea}>
            <View style={[styles.typeChip, { backgroundColor: typeStyle.bg }]}>
              <Ionicons
                name={typeStyle.icon}
                size={12}
                color={typeStyle.color}
              />
              <Text style={[styles.typeLabel, { color: typeStyle.color }]}>
                {typeStyle.label}
              </Text>
            </View>
            <Text style={styles.scheduleTitle} numberOfLines={1}>
              {item.job_title}
            </Text>
          </View>
          <View style={styles.timeColumn}>
            <Text style={styles.timeStart}>{item.time_start}</Text>
            {item.time_end && (
              <Text style={styles.timeEnd}>{item.time_end}</Text>
            )}
          </View>
        </View>

        {item.address && (
          <View style={styles.addressRow}>
            <Ionicons
              name='location-outline'
              size={13}
              color={theme.colors.textTertiary}
            />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardChevron}>
        <Ionicons
          name='chevron-forward'
          size={16}
          color={theme.colors.textTertiary}
        />
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ────────────────────────────────────────────────
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
      // 2026-05-01 audit P0-1: routed through
      // `GET /api/contractor/appointments` instead of querying the
      // `appointments` table directly via Supabase. The route applies
      // the same `contractor_id = user.id` filter server-side and
      // joins jobs() for the title. We pull a wider window
      // (`daysAhead=180`) so historical events still render in the
      // weekly strip.
      const res = await mobileApiClient.get<{
        appointments: Array<{
          id: string;
          jobId?: string;
          jobTitle?: string;
          title: string;
          date: string;
          time: string;
          endTime?: string;
          type?: string;
          status?: string;
          location?: string;
        }>;
      }>('/api/contractor/appointments?daysAhead=180');

      return (res.appointments || []).map(
        (a): ScheduleItem => ({
          id: a.id,
          job_id: a.jobId || a.id,
          job_title: a.jobTitle || a.title || 'Untitled',
          date: a.date,
          time_start: a.time || '09:00',
          time_end: a.endTime,
          // The route's `type` field is the location type
          // (onsite/remote/phone). All three render as 'meeting' on
          // the timeline.
          type: 'meeting',
          status: a.status || 'scheduled',
          address: a.location,
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

  // Count events per day (by type for multi-dot)
  const eventsByDate = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    schedule?.forEach((item) => {
      if (!map[item.date]) map[item.date] = new Set();
      map[item.date]!.add(item.type);
    });
    return map;
  }, [schedule]);

  // Daily stat counts
  const dailyStats = useMemo(() => {
    const stats = { job: 0, meeting: 0, deadline: 0 };
    filteredSchedule.forEach((item) => {
      stats[item.type] = (stats[item.type] || 0) + 1;
    });
    return stats;
  }, [filteredSchedule]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const navigateWeek = (dir: -1 | 1) => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  const monthLabel = selectedDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
  const dayLabel = selectedDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const totalEvents = filteredSchedule.length;

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor='transparent'
        barStyle='light-content'
      />

      {/* ── Green Gradient Hero ── */}
      <LinearGradient colors={gradients.heroGreen} style={styles.hero}>
        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />

        <View style={{ height: insets.top + 12 }} />

        {/* Top bar */}
        <View style={styles.heroTopBar}>
          <TouchableOpacity
            style={styles.frostedCircle}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name='arrow-back'
              size={20}
              color={theme.colors.textInverse}
            />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Calendar</Text>
          <TouchableOpacity
            style={styles.todayPill}
            onPress={() => setSelectedDate(new Date())}
            accessibilityLabel='Go to today'
          >
            <Ionicons
              name='today-outline'
              size={14}
              color={theme.colors.primary}
            />
            <Text style={styles.todayPillText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* Month navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.navArrow}
            onPress={() => navigateWeek(-1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name='chevron-back'
              size={18}
              color='rgba(255,255,255,0.8)'
            />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity
            style={styles.navArrow}
            onPress={() => navigateWeek(1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name='chevron-forward'
              size={18}
              color='rgba(255,255,255,0.8)'
            />
          </TouchableOpacity>
        </View>

        {/* Week strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekStrip}
        >
          {weekDays.map((day) => {
            const key = toDateKey(day);
            const isSel = key === selectedDateKey;
            const isTod = isToday(day);
            const eventTypes = eventsByDate[key];

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.dayCell,
                  isSel && styles.dayCellSelected,
                  isTod && !isSel && styles.dayCellToday,
                ]}
                onPress={() => setSelectedDate(day)}
                accessibilityRole='button'
                accessibilityState={{ selected: isSel }}
                accessibilityLabel={`${WEEKDAYS[day.getDay()]} ${day.getDate()}`}
              >
                <Text style={[styles.dayName, isSel && styles.dayTextSelected]}>
                  {WEEKDAYS[day.getDay()]}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isSel && styles.dayTextSelected,
                    isTod && !isSel && styles.dayNumberToday,
                  ]}
                >
                  {day.getDate()}
                </Text>
                {/* Multi-color event dots */}
                {eventTypes && (
                  <View style={styles.dotsRow}>
                    {eventTypes.has('job') && (
                      <View
                        style={[
                          styles.eventDot,
                          isSel
                            ? styles.eventDotWhite
                            : { backgroundColor: theme.colors.primary },
                        ]}
                      />
                    )}
                    {eventTypes.has('meeting') && (
                      <View
                        style={[
                          styles.eventDot,
                          isSel
                            ? styles.eventDotWhite
                            : { backgroundColor: '#3B82F6' },
                        ]}
                      />
                    )}
                    {eventTypes.has('deadline') && (
                      <View
                        style={[
                          styles.eventDot,
                          isSel
                            ? styles.eventDotWhite
                            : { backgroundColor: theme.colors.error },
                        ]}
                      />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* ── Daily Stats Pills ── */}
      <View style={styles.statsBar}>
        <View style={styles.statPill}>
          <View
            style={[styles.statDot, { backgroundColor: theme.colors.primary }]}
          />
          <Text style={styles.statText}>
            {dailyStats.job} {dailyStats.job === 1 ? 'Job' : 'Jobs'}
          </Text>
        </View>
        <View style={styles.statPill}>
          <View style={[styles.statDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.statText}>
            {dailyStats.meeting}{' '}
            {dailyStats.meeting === 1 ? 'Meeting' : 'Meetings'}
          </Text>
        </View>
        <View style={styles.statPill}>
          <View
            style={[styles.statDot, { backgroundColor: theme.colors.error }]}
          />
          <Text style={styles.statText}>
            {dailyStats.deadline}{' '}
            {dailyStats.deadline === 1 ? 'Deadline' : 'Deadlines'}
          </Text>
        </View>
      </View>

      {/* ── Day label ── */}
      <View style={styles.dayLabelRow}>
        <Text style={styles.dayLabelText}>{dayLabel}</Text>
        <Text style={styles.dayLabelCount}>
          {totalEvents} {totalEvents === 1 ? 'event' : 'events'}
        </Text>
      </View>

      {/* ── Loading / Error / Content ── */}
      {isLoading ? (
        <View style={styles.centeredState}>
          <View style={styles.loadingWrap}>
            <Ionicons name='calendar' size={28} color={theme.colors.primary} />
          </View>
          <Text style={styles.stateTitle}>Loading schedule...</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredState}>
          <View style={[styles.stateIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons
              name='warning-outline'
              size={28}
              color={theme.colors.error}
            />
          </View>
          <Text style={styles.stateTitle}>Failed to load schedule</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Ionicons
              name='refresh'
              size={16}
              color={theme.colors.textInverse}
            />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredSchedule.length === 0 ? (
        <View style={styles.centeredState}>
          <View style={styles.stateIconWrap}>
            <Ionicons
              name='calendar-outline'
              size={32}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.stateTitle}>No events</Text>
          <Text style={styles.stateSubtitle}>
            Your agenda is beautifully clear.{'\n'}Time to find your next
            project.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() =>
              // 2026-05-01 audit P1: typed cross-stack helper replaces
              // `navigation as never as { navigate }` cast. JobsList lives
              // on JobsStack inside JobsTab — goToTab encapsulates the
              // canonical nested-navigate shape.
              goToTab(navigation, 'JobsTab', { screen: 'JobsList' })
            }
          >
            <Ionicons
              name='briefcase-outline'
              size={16}
              color={theme.colors.textInverse}
            />
            <Text style={styles.browseButtonText}>Browse Jobs</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredSchedule}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ScheduleCard
              item={item}
              onPress={() =>
                // 2026-05-01 audit P1: typed cross-stack helper replaces
                // nested `as never as` cast. Mirrors the JobsList CTA
                // above for consistency.
                goToTab(navigation, 'JobsTab', {
                  screen: 'JobDetails',
                  params: { jobId: item.job_id },
                })
              }
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
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
