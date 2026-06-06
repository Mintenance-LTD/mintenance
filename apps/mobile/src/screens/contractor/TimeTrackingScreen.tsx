import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';
import type { ProfileStackParamList } from '../../navigation/types';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { useToast } from '../../components/ui/Toast';
import { styles } from './time-tracking/styles';

interface TimeEntry {
  id: string;
  task_description: string;
  job_title?: string;
  date: string;
  hours: number;
  hourly_rate: number;
  billable: boolean;
  status?: string;
  startTime?: string;
}

/**
 * TimeTrackingScreen — Mint Editorial redesign per redesign-v2
 * contractor business deck screen 08 "Time".
 *
 * Layout:
 *   1. Lightweight back nav + serif "Time" header with eyebrow + sub
 *      "Track hours against any job".
 *   2. Mint hero card. *Note*: the deck shows a live "CURRENTLY
 *      TRACKING · <client> · 01:24:18" running clock with Pause /
 *      Stop&invoice. We do not yet have a live-timer column on
 *      `contractor_time_entries` — entries are written as completed
 *      duration rows via the AddTimeEntry flow. To stay honest, the
 *      hero renders the contractor's billable-this-week total in
 *      serif type with a "Bill this week" CTA when there's something
 *      to invoice. A future migration adding `started_at` /
 *      `paused_at` columns would let us swap this for a true clock.
 *   3. Today + This week paired bento tiles.
 *   4. Recent entries grouped by weekday.
 *   5. Mint + FAB to add a new entry (kept for adding past hours).
 */
const formatHours = (hours: number): string => {
  if (hours <= 0) return '0h';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const fmtGBP = (n: number): string =>
  `£${Math.round(n).toLocaleString('en-GB')}`;

const formatClock = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
};

const nowTimeString = (): string => {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
};

export const TimeTrackingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-time-tracking', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('contractor_time_entries')
        .select('*, job:jobs!contractor_time_entries_job_id_fkey(title)')
        .eq('contractor_id', user.id)
        .order('date', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []).map(
        (e: Record<string, unknown>): TimeEntry => ({
          id: e.id as string,
          task_description: (e.task_description as string) || '',
          job_title:
            ((e.job as Record<string, unknown>)?.title as string) ||
            (e.job_title as string) ||
            undefined,
          date: e.date as string,
          hours: ((e.duration_minutes as number) || 0) / 60,
          hourly_rate: (e.hourly_rate as number) || 0,
          billable: (e.is_billable as boolean) ?? false,
          status: (e.status as string) || 'stopped',
          startTime: (e.start_time as string) || undefined,
        })
      );
    },
    enabled: !!user?.id,
  });

  const entries = data || [];
  const runningEntry = entries.find((e) => e.status === 'running');
  const finishedEntries = entries.filter((e) => e.status !== 'running');

  // Live timer tick. Elapsed is recomputed from the running entry's
  // date + start_time anchor (the entry is persisted server-side), so the
  // clock survives a screen remount or app backgrounding rather than living
  // only in component memory.
  useEffect(() => {
    if (!runningEntry?.startTime) {
      setElapsedSeconds(0);
      return;
    }
    const anchor = new Date(
      `${runningEntry.date}T${runningEntry.startTime}`
    ).getTime();
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - anchor) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [runningEntry?.id, runningEntry?.startTime, runningEntry?.date]);

  const handleStartTimer = async () => {
    if (!user?.id) return;
    try {
      await mobileApiClient.post('/api/contractor/time-tracking', {
        taskDescription: 'Timed work',
        durationMinutes: 0,
        date: new Date().toISOString().slice(0, 10),
        startTime: nowTimeString(),
        status: 'running',
        isBillable: true,
      });
      queryClient.invalidateQueries({ queryKey: ['contractor-time-tracking'] });
    } catch {
      toast.error('Could not start timer', 'Please try again.');
    }
  };

  const handleStopTimer = async () => {
    if (!runningEntry) return;
    const minutes = Math.max(1, Math.round(elapsedSeconds / 60));
    try {
      await mobileApiClient.patch('/api/contractor/time-tracking', {
        id: runningEntry.id,
        status: 'stopped',
        endTime: nowTimeString(),
        durationMinutes: minutes,
      });
      queryClient.invalidateQueries({ queryKey: ['contractor-time-tracking'] });
      toast.success('Timer stopped', `${formatHours(minutes / 60)} logged`);
    } catch {
      toast.error('Could not stop timer', 'Please try again.');
    }
  };

  const grouped = finishedEntries.reduce<Record<string, TimeEntry[]>>(
    (acc, entry) => {
      const dateKey = new Date(entry.date).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      });
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(entry);
      return acc;
    },
    {}
  );

  const sections = Object.entries(grouped).map(([title, sectionData]) => ({
    title,
    data: sectionData,
  }));

  // ─── Stats ──────────────────────────────────────────────────────
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const thisWeekEntries = finishedEntries.filter(
    (e) => new Date(e.date) >= weekStart
  );
  const todayEntries = finishedEntries.filter(
    (e) => new Date(e.date).toISOString().slice(0, 10) === todayKey
  );
  const totalHoursToday = todayEntries.reduce((sum, e) => sum + e.hours, 0);
  const totalHoursWeek = thisWeekEntries.reduce((sum, e) => sum + e.hours, 0);
  const billableHoursWeek = thisWeekEntries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.hours, 0);
  const estimatedEarnings = thisWeekEntries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.hours * e.hourly_rate, 0);

  const invoiceLineItems = useMemo(() => {
    const groups = new Map<
      string,
      { hours: number; rate: number; latestDate: string }
    >();
    for (const entry of thisWeekEntries) {
      if (!entry.billable) continue;
      const key = entry.job_title || 'General labor';
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          hours: entry.hours,
          rate: entry.hourly_rate,
          latestDate: entry.date,
        });
      } else {
        existing.hours += entry.hours;
        if (entry.date > existing.latestDate) {
          existing.rate = entry.hourly_rate;
          existing.latestDate = entry.date;
        }
      }
    }
    return Array.from(groups.entries()).map(([jobKey, agg]) => ({
      description:
        jobKey === 'General labor' ? 'Labor (this week)' : `Labor — ${jobKey}`,
      quantity: agg.hours.toFixed(2),
      rate: agg.rate.toFixed(2),
    }));
  }, [thisWeekEntries]);

  const canCreateInvoice = invoiceLineItems.length > 0;

  const handleCreateInvoice = () => {
    if (!canCreateInvoice) return;
    const dominantJob = thisWeekEntries
      .filter((e) => e.billable && e.job_title)
      .reduce<Record<string, number>>((acc, e) => {
        const k = e.job_title as string;
        acc[k] = (acc[k] || 0) + e.hours;
        return acc;
      }, {});
    const dominantJobKey = Object.entries(dominantJob).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    navigation.navigate('CreateInvoice', {
      initialLineItems: invoiceLineItems,
      jobRef: dominantJobKey,
    });
  };

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
      </View>

      <View style={styles.screenHeader}>
        <Text style={styles.eyebrow}>Time</Text>
        <Text style={styles.headline}>Time</Text>
        <Text style={styles.sub}>Track hours against any job</Text>
      </View>

      <View style={styles.heroCard}>
        {runningEntry ? (
          <>
            <Text style={styles.heroEyebrow}>Currently tracking</Text>
            <Text style={styles.heroBig}>{formatClock(elapsedSeconds)}</Text>
            <Text style={styles.heroSub}>
              {runningEntry.task_description || 'Timed work'}
              {runningEntry.job_title ? ` — ${runningEntry.job_title}` : ''}
            </Text>
            <View style={styles.heroBtnRow}>
              <TouchableOpacity
                style={styles.heroBtnSecondary}
                onPress={() => navigation.navigate('AddTimeEntry')}
                accessibilityRole='button'
                accessibilityLabel='Log hours manually'
              >
                <Ionicons name='time-outline' size={16} color={me.onBrand} />
                <Text style={styles.heroBtnSecondaryText}>Log hours</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroBtnPrimary}
                onPress={handleStopTimer}
                accessibilityRole='button'
                accessibilityLabel='Stop timer and log the time'
              >
                <Ionicons
                  name='stop-circle-outline'
                  size={16}
                  color={me.brand}
                />
                <Text style={styles.heroBtnPrimaryText}>Stop timer</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.heroEyebrow}>
              {canCreateInvoice ? 'Billable · this week' : 'This week'}
            </Text>
            <Text style={styles.heroBig}>
              {formatHours(billableHoursWeek || totalHoursWeek)}
            </Text>
            {canCreateInvoice ? (
              <Text style={styles.heroSub}>
                {fmtGBP(estimatedEarnings)} ready to invoice across{' '}
                {invoiceLineItems.length}{' '}
                {invoiceLineItems.length === 1 ? 'job' : 'jobs'}
              </Text>
            ) : (
              <Text style={styles.heroSub}>
                Start a timer or log billable hours to bill in one tap.
              </Text>
            )}
            <View style={styles.heroBtnRow}>
              <TouchableOpacity
                style={styles.heroBtnSecondary}
                onPress={handleStartTimer}
                accessibilityRole='button'
                accessibilityLabel='Start a live timer'
              >
                <Ionicons
                  name='play-circle-outline'
                  size={16}
                  color={me.onBrand}
                />
                <Text style={styles.heroBtnSecondaryText}>Start timer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.heroBtnPrimary,
                  !canCreateInvoice && styles.heroBtnDisabled,
                ]}
                onPress={handleCreateInvoice}
                disabled={!canCreateInvoice}
                accessibilityRole='button'
                accessibilityLabel='Stop tracking and create invoice'
              >
                <Ionicons
                  name='document-text-outline'
                  size={16}
                  color={me.brand}
                />
                <Text style={styles.heroBtnPrimaryText}>Stop & invoice</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={styles.bentoRow}>
        <View style={styles.bentoTile}>
          <Text style={styles.bentoLabel}>Today</Text>
          <Text style={styles.bentoValue}>{formatHours(totalHoursToday)}</Text>
        </View>
        <View style={styles.bentoTile}>
          <Text style={styles.bentoLabel}>This week</Text>
          <Text style={styles.bentoValue}>{formatHours(totalHoursWeek)}</Text>
        </View>
      </View>

      <Text style={styles.sectionEyebrow}>Recent entries</Text>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size='large' color={me.brand} />
          <Text style={styles.loadingText}>Loading entries…</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name='alert-circle-outline' size={28} color={me.errFg} />
          </View>
          <Text style={styles.emptyTitle}>Failed to load</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={me.brand}
              colors={[me.brand]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name='time-outline' size={24} color={me.brand} />
              </View>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptySubtitle}>
                Log your first hours from the Log hours CTA above.
              </Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.entryRow}>
              <View style={styles.entryInfo}>
                <Text style={styles.entryTask} numberOfLines={1}>
                  {item.task_description || 'Labor'}
                  {item.job_title ? ` — ${item.job_title}` : ''}
                </Text>
                {item.billable ? (
                  <Text style={styles.entryBillable}>
                    {fmtGBP(item.hours * item.hourly_rate)} billable
                  </Text>
                ) : (
                  <Text style={styles.entryNonBillable}>Non-billable</Text>
                )}
              </View>
              <Text style={styles.entryHours}>{formatHours(item.hours)}</Text>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTimeEntry')}
        accessibilityRole='button'
        accessibilityLabel='Add time entry'
      >
        <Ionicons name='add' size={26} color={me.onBrand} />
      </TouchableOpacity>
    </View>
  );
};

export default TimeTrackingScreen;
