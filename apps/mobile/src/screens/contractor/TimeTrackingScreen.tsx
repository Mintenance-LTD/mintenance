import React from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
  const navigation = useNavigation();
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-time-tracking', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: rows, error: err } = await supabase
        .from('time_entries')
        .select('id, task_description, job_title, date, duration_minutes, hourly_rate, is_billable')
        .eq('contractor_id', user.id)
        .order('date', { ascending: false });
      if (err) throw new Error(err.message);
      return (rows || []).map((e: Record<string, unknown>): TimeEntry => ({
        id: e.id as string,
        task_description: e.task_description as string || '',
        job_title: e.job_title as string | undefined,
        date: e.date as string,
        hours: ((e.duration_minutes as number) || 0) / 60,
        hourly_rate: (e.hourly_rate as number) || 0,
        billable: (e.is_billable as boolean) ?? false,
      }));
    },
    enabled: !!user?.id,
  });

  const entries = data || [];

  // Group by date
  const grouped = entries.reduce<Record<string, TimeEntry[]>>((acc, entry) => {
    const dateKey = new Date(entry.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([title, sectionData]) => ({ title, data: sectionData }));

  // Stats
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const thisWeekEntries = entries.filter((e) => new Date(e.date) >= weekStart);
  const totalHoursWeek = thisWeekEntries.reduce((sum, e) => sum + e.hours, 0);
  const billableHoursWeek = thisWeekEntries.filter((e) => e.billable).reduce((sum, e) => sum + e.hours, 0);
  const estimatedEarnings = thisWeekEntries.filter((e) => e.billable).reduce((sum, e) => sum + e.hours * e.hourly_rate, 0);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {/* Green gradient hero */}
      <LinearGradient
        colors={['#064E3B', '#059669', '#10B981']}
        style={styles.hero}
      >
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <View style={{ height: insets.top + 12 }} />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.heroTitle}>Time Tracking</Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{totalHoursWeek.toFixed(1)}h</Text>
            <Text style={styles.heroStatLabel}>This Week</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{billableHoursWeek.toFixed(1)}h</Text>
            <Text style={styles.heroStatLabel}>Billable</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{'\u00A3'}{estimatedEarnings.toFixed(0)}</Text>
            <Text style={styles.heroStatLabel}>Earnings</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading entries...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="alert-circle-outline" size={28} color="#EF4444" />
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
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#10B981" colors={['#10B981']} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="time-outline" size={28} color="#10B981" />
              </View>
              <Text style={styles.emptyTitle}>No Time Entries</Text>
              <Text style={styles.emptySubtitle}>Track your working hours here</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.entryRow}>
              <View style={styles.entryInfo}>
                <Text style={styles.entryTask} numberOfLines={1}>{item.task_description}</Text>
                {item.job_title && <Text style={styles.entryJob}>{item.job_title}</Text>}
              </View>
              <View style={styles.entryRight}>
                <Text style={styles.entryHours}>{item.hours}h</Text>
                <Text style={styles.entryRate}>{'\u00A3'}{item.hourly_rate}/hr</Text>
                {item.billable && <Badge variant="success" size="sm">Billable</Badge>}
              </View>
            </View>
          )}
        />
      )}

      {/* Green FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTimeEntry' as never)}
        accessibilityRole="button"
        accessibilityLabel="Add time entry"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  hero: {
    paddingBottom: 28,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 18,
  },
  heroStats: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, padding: 16,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginTop: 2 },
  heroDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#717171' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#D1FAE5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#222222', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#717171', textAlign: 'center' },
  retryText: { fontSize: 14, color: '#10B981', fontWeight: '600', marginTop: 8 },
  list: { padding: 16, paddingBottom: 80 },
  sectionHeader: {
    fontSize: 12, fontWeight: '700', color: '#B0B0B0', textTransform: 'uppercase',
    letterSpacing: 0.8, marginTop: 8, marginBottom: 8,
  },
  entryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  entryInfo: { flex: 1, marginRight: 12 },
  entryTask: { fontSize: 15, fontWeight: '600', color: '#222222' },
  entryJob: { fontSize: 12, color: '#B0B0B0', marginTop: 2 },
  entryRight: { alignItems: 'flex-end', gap: 2 },
  entryHours: { fontSize: 17, fontWeight: '700', color: '#222222' },
  entryRate: { fontSize: 12, color: '#B0B0B0' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
});

export default TimeTrackingScreen;
