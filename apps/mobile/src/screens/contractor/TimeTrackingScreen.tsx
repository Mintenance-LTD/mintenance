import React from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { theme } from '../../theme';
import { mobileApiClient } from '../../utils/mobileApiClient';

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
  const navigation = useNavigation();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-time-tracking'],
    queryFn: async () => {
      interface ApiEntry { id: string; taskDescription: string; jobTitle?: string; date: string; duration: number; hourlyRate: number; isBillable: boolean }
      const res = await mobileApiClient.get<{ entries: ApiEntry[] }>('/api/contractor/time-tracking');
      return (res.entries || []).map((e): TimeEntry => ({
        id: e.id, task_description: e.taskDescription, job_title: e.jobTitle,
        date: e.date, hours: e.duration / 60, hourly_rate: e.hourlyRate, billable: e.isBillable,
      }));
    },
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

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorView onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Time Tracking" showBack onBack={() => navigation.goBack()} />

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>This Week</Text>
          <Text style={styles.statValue}>{totalHoursWeek.toFixed(1)}h</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Billable</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{billableHoursWeek.toFixed(1)}h</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Earnings</Text>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>{'\u00A3'}{estimatedEarnings.toFixed(0)}</Text>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        ListEmptyComponent={<EmptyState icon="time-outline" title="No Time Entries" subtitle="Track your working hours here." />}
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => Alert.alert('Add Entry', 'Form coming soon.')}
        accessibilityLabel="Add time entry"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  statCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12, alignItems: 'center', ...theme.shadows.sm },
  statLabel: { fontSize: 11, color: theme.colors.textTertiary, fontWeight: '500', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  list: { padding: 16, paddingBottom: 80 },
  sectionHeader: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 8, marginBottom: 8 },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14, marginBottom: 8, ...theme.shadows.sm },
  entryInfo: { flex: 1, marginRight: 12 },
  entryTask: { fontSize: 15, fontWeight: '500', color: theme.colors.textPrimary },
  entryJob: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  entryRight: { alignItems: 'flex-end', gap: 2 },
  entryHours: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  entryRate: { fontSize: 12, color: theme.colors.textTertiary },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', ...theme.shadows.lg },
});

export default TimeTrackingScreen;
