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
  StyleSheet,
  RefreshControl,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient as apiClient } from '../utils/mobileApiClient';

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

const TYPE_STYLES: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  job:      { color: '#10B981', bg: '#D1FAE5', icon: 'hammer-outline', label: 'Job' },
  meeting:  { color: '#3B82F6', bg: '#DBEAFE', icon: 'people-outline', label: 'Meeting' },
  deadline: { color: '#EF4444', bg: '#FEE2E2', icon: 'alarm-outline', label: 'Deadline' },
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
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

// ─── Schedule Card ──────────────────────────────────────────────
const ScheduleCard: React.FC<{
  item: ScheduleItem;
  onPress: () => void;
}> = ({ item, onPress }) => {
  const typeStyle = TYPE_STYLES[item.type] || { color: '#717171', bg: '#F0F0F0', icon: 'calendar-outline' as const, label: 'Event' };

  return (
    <TouchableOpacity
      style={styles.scheduleCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${typeStyle.label}: ${item.job_title} at ${item.time_start}`}
      activeOpacity={0.7}
    >
      {/* Color accent bar */}
      <View style={[styles.accentBar, { backgroundColor: typeStyle.color }]} />

      <View style={styles.cardInner}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTitleArea}>
            <View style={[styles.typeChip, { backgroundColor: typeStyle.bg }]}>
              <Ionicons name={typeStyle.icon} size={12} color={typeStyle.color} />
              <Text style={[styles.typeLabel, { color: typeStyle.color }]}>{typeStyle.label}</Text>
            </View>
            <Text style={styles.scheduleTitle} numberOfLines={1}>{item.job_title}</Text>
          </View>
          <View style={styles.timeColumn}>
            <Text style={styles.timeStart}>{item.time_start}</Text>
            {item.time_end && <Text style={styles.timeEnd}>{item.time_end}</Text>}
          </View>
        </View>

        {item.address && (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={13} color="#B0B0B0" />
            <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardChevron}>
        <Ionicons name="chevron-forward" size={16} color="#B0B0B0" />
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

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate.toISOString().slice(0, 10)]);
  const selectedDateKey = toDateKey(selectedDate);

  const { data: schedule, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-schedule', user?.id],
    queryFn: async () => {
      const response = await apiClient.get<AppointmentsResponse>('/api/appointments');
      return (response.appointments || []).map((appointment) => ({
        id: appointment.id,
        job_id: appointment.jobId || appointment.id,
        job_title: appointment.jobTitle || appointment.title,
        date: appointment.date,
        time_start: appointment.time,
        time_end: appointment.endTime,
        type: (appointment.type === 'job' || appointment.type === 'meeting' || appointment.type === 'deadline')
          ? appointment.type
          : 'meeting',
        status: appointment.status,
        address: appointment.location,
      })) as ScheduleItem[];
    },
    enabled: !!user,
  });

  const filteredSchedule = useMemo(() => {
    if (!schedule) return [];
    return schedule.filter((item) => item.date === selectedDateKey)
      .sort((a, b) => a.time_start.localeCompare(b.time_start));
  }, [schedule, selectedDateKey]);

  // Count events per day (by type for multi-dot)
  const eventsByDate = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    schedule?.forEach((item) => {
      if (!map[item.date]) map[item.date] = new Set();
      map[item.date].add(item.type);
    });
    return map;
  }, [schedule]);

  // Daily stat counts
  const dailyStats = useMemo(() => {
    const stats = { job: 0, meeting: 0, deadline: 0 };
    filteredSchedule.forEach((item) => { stats[item.type] = (stats[item.type] || 0) + 1; });
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

  const monthLabel = selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const dayLabel = selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const totalEvents = filteredSchedule.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Green Gradient Hero ── */}
      <LinearGradient colors={['#064E3B', '#059669', '#10B981']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />

        {/* Top bar */}
        <View style={styles.heroTopBar}>
          <TouchableOpacity style={styles.frostedCircle} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Calendar</Text>
          <TouchableOpacity
            style={styles.todayPill}
            onPress={() => setSelectedDate(new Date())}
            accessibilityLabel="Go to today"
          >
            <Ionicons name="today-outline" size={14} color="#10B981" />
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
            <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity
            style={styles.navArrow}
            onPress={() => navigateWeek(1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* Week strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekStrip}>
          {weekDays.map((day) => {
            const key = toDateKey(day);
            const isSel = key === selectedDateKey;
            const isTod = isToday(day);
            const eventTypes = eventsByDate[key];

            return (
              <TouchableOpacity
                key={key}
                style={[styles.dayCell, isSel && styles.dayCellSelected, isTod && !isSel && styles.dayCellToday]}
                onPress={() => setSelectedDate(day)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                accessibilityLabel={`${WEEKDAYS[day.getDay()]} ${day.getDate()}`}
              >
                <Text style={[styles.dayName, isSel && styles.dayTextSelected]}>
                  {WEEKDAYS[day.getDay()]}
                </Text>
                <Text style={[styles.dayNumber, isSel && styles.dayTextSelected, isTod && !isSel && styles.dayNumberToday]}>
                  {day.getDate()}
                </Text>
                {/* Multi-color event dots */}
                {eventTypes && (
                  <View style={styles.dotsRow}>
                    {eventTypes.has('job') && <View style={[styles.eventDot, isSel ? styles.eventDotWhite : { backgroundColor: '#10B981' }]} />}
                    {eventTypes.has('meeting') && <View style={[styles.eventDot, isSel ? styles.eventDotWhite : { backgroundColor: '#3B82F6' }]} />}
                    {eventTypes.has('deadline') && <View style={[styles.eventDot, isSel ? styles.eventDotWhite : { backgroundColor: '#EF4444' }]} />}
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
          <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.statText}>{dailyStats.job} {dailyStats.job === 1 ? 'Job' : 'Jobs'}</Text>
        </View>
        <View style={styles.statPill}>
          <View style={[styles.statDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.statText}>{dailyStats.meeting} {dailyStats.meeting === 1 ? 'Meeting' : 'Meetings'}</Text>
        </View>
        <View style={styles.statPill}>
          <View style={[styles.statDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.statText}>{dailyStats.deadline} {dailyStats.deadline === 1 ? 'Deadline' : 'Deadlines'}</Text>
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
            <Ionicons name="calendar" size={28} color="#10B981" />
          </View>
          <Text style={styles.stateTitle}>Loading schedule...</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredState}>
          <View style={[styles.stateIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="warning-outline" size={28} color="#EF4444" />
          </View>
          <Text style={styles.stateTitle}>Failed to load schedule</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredSchedule.length === 0 ? (
        <View style={styles.centeredState}>
          <View style={styles.stateIconWrap}>
            <Ionicons name="calendar-outline" size={32} color="#10B981" />
          </View>
          <Text style={styles.stateTitle}>No events</Text>
          <Text style={styles.stateSubtitle}>Nothing scheduled for this day</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => (navigation as never as { navigate: (s: string) => void }).navigate('JobsList')}
          >
            <Ionicons name="briefcase-outline" size={16} color="#FFFFFF" />
            <Text style={styles.browseButtonText}>Browse Jobs</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredSchedule}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ScheduleCard
              item={item}
              onPress={() => (navigation as never as { navigate: (s: string, p: object) => void }).navigate('JobDetails', { jobId: item.job_id })}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10B981" colors={['#10B981']} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Green FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => (navigation as never as { navigate: (s: string) => void }).navigate('MeetingSchedule')}
        accessibilityRole="button"
        accessibilityLabel="Schedule new event"
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },

  // ── Hero ──
  hero: {
    paddingBottom: 16,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle1: {
    width: 200,
    height: 200,
    top: -60,
    right: -40,
  },
  decorCircle2: {
    width: 140,
    height: 140,
    bottom: -30,
    left: -30,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  frostedCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  todayPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },

  // ── Month nav ──
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 14,
  },
  navArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    minWidth: 160,
    textAlign: 'center',
  },

  // ── Week strip ──
  weekStrip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
  },
  dayCell: {
    flex: 1,
    minWidth: 44,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
  },
  dayCellSelected: {
    backgroundColor: '#FFFFFF',
  },
  dayCellToday: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dayTextSelected: {
    color: '#10B981',
  },
  dayNumberToday: {
    color: '#FFFFFF',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  eventDotWhite: {
    backgroundColor: '#10B981',
  },

  // ── Stats bar ──
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#717171',
  },

  // ── Day label ──
  dayLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dayLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -0.2,
  },
  dayLabelCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B0B0B0',
  },

  // ── Schedule cards ──
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },
  scheduleCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  accentBar: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitleArea: {
    flex: 1,
    marginRight: 12,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  timeColumn: {
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  timeStart: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },
  timeEnd: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#B0B0B0',
    flex: 1,
  },
  cardChevron: {
    justifyContent: 'center',
    paddingRight: 12,
  },

  // ── States ──
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stateIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 4,
  },
  stateSubtitle: {
    fontSize: 14,
    color: '#717171',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
});

export default CalendarScreen;
