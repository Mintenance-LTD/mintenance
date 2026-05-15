import React, { useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { me } from '../../design-system/mint-editorial';
import type { ProfileStackParamList } from '../../navigation/types';

interface TimeEntry {
  id: string;
  task_description: string;
  job_title?: string;
  date: string;
  hours: number;
  hourly_rate: number;
  billable: boolean;
}

export const TimeTrackingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();
  const { user } = useAuth();

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
        })
      );
    },
    enabled: !!user?.id,
  });

  const entries = data || [];

  // Group by date
  const grouped = entries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    const dateKey = new Date(entry.date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([title, sectionData]) => ({
    title,
    data: sectionData,
  }));

  // Stats
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const thisWeekEntries = entries.filter((e) => new Date(e.date) >= weekStart);
  const totalHoursWeek = thisWeekEntries.reduce((sum, e) => sum + e.hours, 0);
  const billableHoursWeek = thisWeekEntries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.hours, 0);
  const estimatedEarnings = thisWeekEntries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.hours * e.hourly_rate, 0);

  // Audit P1 #14 (2026-04-25): Time-Tracking → Invoice bridge.
  //
  // Aggregate this-week's billable entries by `job_title` (or
  // "General labor" when no job is attached) so the contractor can
  // pre-fill an invoice in one tap. Each line item is one job.
  // Quantity = total hours, rate = the hourly_rate of the most
  // recent entry in that group (rates can drift over time, so
  // pick the latest as a sensible default — the contractor can
  // edit on the next screen).
  //
  // We deliberately do NOT mark entries as "invoiced" yet — that
  // would require a DB schema change (invoice_id column on
  // contractor_time_entries) and a back-end mutation. For the
  // MVP, contractors visually track which weeks they've already
  // invoiced. A follow-up commit can add invoice_id linkage.
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
        // Keep the most recent rate as the line-item default.
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
    // Pick the most-tracked job as a default jobRef hint.
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
        barStyle='light-content'
      />
      {/* Green gradient hero */}
      <LinearGradient colors={[me.brand2, me.brand]} style={styles.hero}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <View style={{ height: insets.top + 12 }} />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='chevron-back' size={22} color={me.onBrand} />
        </TouchableOpacity>

        <Text style={styles.heroTitle}>Time Tracking</Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>
              {totalHoursWeek.toFixed(1)}h
            </Text>
            <Text style={styles.heroStatLabel}>This Week</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>
              {billableHoursWeek.toFixed(1)}h
            </Text>
            <Text style={styles.heroStatLabel}>Billable</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>
              {'\u00A3'}
              {estimatedEarnings.toFixed(0)}
            </Text>
            <Text style={styles.heroStatLabel}>Earnings</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Audit P1 #14 (2026-04-25): Create-Invoice CTA when there are
          billable hours this week. Sits above the entries list so it's
          discoverable without scrolling, and is dismissible by simply
          not having any billable hours (the bar disappears). */}
      {canCreateInvoice && (
        <View style={styles.invoiceBanner}>
          <View style={styles.invoiceBannerText}>
            <Text style={styles.invoiceBannerTitle}>
              {"Bill this week's hours"}
            </Text>
            <Text style={styles.invoiceBannerSubtitle}>
              {billableHoursWeek.toFixed(1)}h across {invoiceLineItems.length}{' '}
              {invoiceLineItems.length === 1 ? 'job' : 'jobs'} · {'£'}
              {estimatedEarnings.toFixed(0)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.invoiceBannerCta}
            onPress={handleCreateInvoice}
            accessibilityRole='button'
            accessibilityLabel='Create invoice from billable hours'
          >
            <Ionicons
              name='document-text-outline'
              size={16}
              color={me.onBrand}
            />
            <Text style={styles.invoiceBannerCtaText}>Create Invoice</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size='large' color={me.brand} />
          <Text style={styles.loadingText}>Loading entries...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: '#FEE2E2' }]}>
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
                <Ionicons name='time-outline' size={28} color={me.brand} />
              </View>
              <Text style={styles.emptyTitle}>No Time Entries</Text>
              <Text style={styles.emptySubtitle}>
                Track your working hours here
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
                  {item.task_description}
                </Text>
                {item.job_title && (
                  <Text style={styles.entryJob}>{item.job_title}</Text>
                )}
              </View>
              <View style={styles.entryRight}>
                <Text style={styles.entryHours}>{item.hours}h</Text>
                <Text style={styles.entryRate}>
                  {'\u00A3'}
                  {item.hourly_rate}/hr
                </Text>
                {item.billable && (
                  <Badge variant='success' size='sm'>
                    Billable
                  </Badge>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Green FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTimeEntry')}
        accessibilityRole='button'
        accessibilityLabel='Add time entry'
      >
        <Ionicons name='add' size={28} color={me.onBrand} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  hero: {
    paddingBottom: 28,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: me.onBrand,
    letterSpacing: -0.5,
    marginBottom: 18,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 16,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: me.onBrand,
    letterSpacing: -0.5,
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: me.ink2 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: me.ink2,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 14,
    color: me.brand,
    fontWeight: '600',
    marginTop: 8,
  },
  list: { padding: 16, paddingBottom: 80 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 8,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    ...me.shadow.card,
  },
  entryInfo: { flex: 1, marginRight: 12 },
  entryTask: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  entryJob: { fontSize: 12, color: me.ink3, marginTop: 2 },
  entryRight: { alignItems: 'flex-end', gap: 2 },
  entryHours: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
  },
  entryRate: { fontSize: 12, color: me.ink3 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: me.brand,
    justifyContent: 'center',
    alignItems: 'center',
    ...me.shadow.pop,
  },
  // Audit P1 #14 (2026-04-25): Time-Tracking → Invoice CTA banner.
  invoiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: me.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: me.line,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  invoiceBannerText: { flex: 1, gap: 2 },
  invoiceBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: me.ink,
  },
  invoiceBannerSubtitle: {
    fontSize: 12,
    color: me.ink2,
  },
  invoiceBannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: me.brand,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  invoiceBannerCtaText: {
    color: me.onBrand,
    fontSize: 13,
    fontWeight: '600',
  },
});
