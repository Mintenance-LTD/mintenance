import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, Linking, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { ProfileStackParamList, RootTabParamList } from '../navigation/types';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { mobileApiClient } from '../utils/mobileApiClient';
import { LoadingSpinner } from '../components/LoadingSpinner';
import SearchBar from '../components/SearchBar';
import { theme } from '../theme';

interface DerivedClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  profile_image_url?: string;
  total_jobs: number;
  total_revenue: number;
  last_job_date: string;
  last_job_title: string;
  relationship_status: 'active' | 'prospect' | 'inactive';
}

interface JobRecord {
  id: string;
  homeowner_id: string;
  status: string;
  title?: string;
  created_at: string;
  completed_at?: string;
  budget?: number;
  final_price?: number;
  homeowner?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    profile_image_url?: string;
  };
}

type FilterKey = 'all' | 'active' | 'prospect' | 'inactive';
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'prospect', label: 'Prospects' },
  { key: 'inactive', label: 'Inactive' },
];
const STATUS_DOT: Record<string, string> = { active: '#10B981', prospect: '#F59E0B', inactive: '#B0B0B0' };
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

function deriveClients(jobs: JobRecord[]): DerivedClient[] {
  const map = new Map<string, { jobs: JobRecord[]; owner: JobRecord['homeowner'] }>();
  for (const job of jobs) {
    if (!job.homeowner_id) continue;
    const entry = map.get(job.homeowner_id) || { jobs: [], owner: job.homeowner };
    entry.jobs.push(job);
    if (job.homeowner) entry.owner = job.homeowner;
    map.set(job.homeowner_id, entry);
  }
  const now = Date.now();
  const result: DerivedClient[] = [];
  map.forEach((entry, hid) => {
    const { owner, jobs: cj } = entry;
    const done = cj.filter((j) => j.status === 'completed' || j.status === 'in_progress');
    const rev = cj.reduce((s, j) => s + (j.final_price || j.budget || 0), 0);
    const sorted = [...cj].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const last = sorted[0];
    const lastDate = last?.completed_at || last?.created_at || '';
    const lastMs = lastDate ? new Date(lastDate).getTime() : 0;
    let status: DerivedClient['relationship_status'] = 'inactive';
    if (done.length === 0) status = 'prospect';
    else if (now - lastMs <= NINETY_DAYS) status = 'active';
    result.push({
      id: hid, first_name: owner?.first_name || 'Unknown', last_name: owner?.last_name || '',
      email: owner?.email || '', phone: owner?.phone, profile_image_url: owner?.profile_image_url,
      total_jobs: cj.length, total_revenue: rev, last_job_date: lastDate,
      last_job_title: last?.title || 'Untitled job', relationship_status: status,
    });
  });
  return result.sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
}

interface CRMDashboardScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'CRMDashboard'>;
}

export const CRMDashboardScreen: React.FC<CRMDashboardScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const tabNav = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [clients, setClients] = useState<DerivedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const raw = await mobileApiClient.get<unknown>('/api/contractor/my-jobs');
      const jobs: JobRecord[] = Array.isArray(raw)
        ? raw
        : ((raw as Record<string, unknown>)?.jobs as JobRecord[]) || [];
      setClients(deriveClients(jobs));
    } catch (err) {
      logger.error('Error loading CRM data', err);
      setError('Failed to load client data. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filtered = clients.filter((c) => {
    if (filter !== 'all' && c.relationship_status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const n = `${c.first_name} ${c.last_name}`.toLowerCase();
      if (!n.includes(q) && !c.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const total = clients.length;
  const active = clients.filter((c) => c.relationship_status === 'active').length;
  const totalRev = clients.reduce((s, c) => s + c.total_revenue, 0);
  const avgVal = total > 0 ? Math.round(totalRev / total) : 0;

  const handleCall = async (c: DerivedClient) => {
    if (!c.phone) return;
    const url = `tel:${c.phone}`;
    if (await Linking.canOpenURL(url)) Linking.openURL(url);
    else Alert.alert('Error', 'Cannot make phone call');
  };
  const handleMessage = (c: DerivedClient) => {
    tabNav.navigate('MessagingTab', {
      screen: 'Messaging',
      params: { conversationId: c.id, recipientId: c.id, recipientName: `${c.first_name} ${c.last_name}`.trim() },
    } as never);
  };
  const handleEmail = async (c: DerivedClient) => {
    const url = `mailto:${c.email}`;
    if (await Linking.canOpenURL(url)) Linking.openURL(url);
    else Alert.alert('Error', 'Cannot open email client');
  };

  const renderCard = ({ item }: { item: DerivedClient }) => {
    const name = `${item.first_name} ${item.last_name}`.trim();
    const dot = STATUS_DOT[item.relationship_status] || '#B0B0B0';
    return (
      <TouchableOpacity style={s.card} activeOpacity={0.7}
        onPress={() => (navigation.navigate as (...a: unknown[]) => void)('ClientDetail', { client: item })}
        accessibilityRole="button" accessibilityLabel={`View ${name}`}>
        <View style={s.cardRow}>
          {item.profile_image_url
            ? <Image source={{ uri: item.profile_image_url }} style={s.avatar} />
            : <View style={s.avatarFb}><Text style={s.initials}>{`${item.first_name.charAt(0)}${item.last_name.charAt(0)}`.toUpperCase()}</Text></View>}
          <View style={s.info}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>{name}</Text>
              <View style={[s.dot, { backgroundColor: dot }]} />
            </View>
            <Text style={s.sub} numberOfLines={1}>{item.last_job_title}</Text>
          </View>
          <View style={s.badge}><Text style={s.badgeTxt}>{'\u00A3'}{item.total_revenue.toLocaleString()}</Text></View>
        </View>
        <View style={s.actions}>
          {item.phone ? <TouchableOpacity style={s.actBtn} onPress={() => handleCall(item)} accessibilityLabel="Call"><Ionicons name="call-outline" size={18} color={theme.colors.textSecondary} /></TouchableOpacity> : null}
          <TouchableOpacity style={s.actBtn} onPress={() => handleMessage(item)} accessibilityLabel="Message"><Ionicons name="chatbubble-outline" size={18} color={theme.colors.textSecondary} /></TouchableOpacity>
          {item.email ? <TouchableOpacity style={s.actBtn} onPress={() => handleEmail(item)} accessibilityLabel="Email"><Ionicons name="mail-outline" size={18} color={theme.colors.textSecondary} /></TouchableOpacity> : null}
        </View>
      </TouchableOpacity>
    );
  };

  const emptyState = () => (
    <View style={s.empty}>
      <View style={s.emptyIco}><Ionicons name="people-outline" size={48} color={theme.colors.textTertiary} /></View>
      <Text style={s.emptyH}>No clients yet</Text>
      <Text style={s.emptyP}>Complete your first job to start building your client list</Text>
      <TouchableOpacity style={s.cta} onPress={() => tabNav.navigate('JobsTab', undefined)} accessibilityRole="button">
        <Text style={s.ctaTxt}>Find Jobs</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <LoadingSpinner message="Loading clients..." />;

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[s.hdr, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.back} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>My Clients</Text>
        <View style={{ width: 40 }} />
      </View>

      {total > 0 && (
        <View style={s.sumBar}>
          <Text style={s.sumTxt}>
            {total} Client{total !== 1 ? 's' : ''}{'  \u00B7  '}{active} Active{'  \u00B7  '}{'\u00A3'}{avgVal.toLocaleString()} avg value
          </Text>
        </View>
      )}

      <View style={s.searchRow}>
        <View style={{ flex: 1 }}><SearchBar placeholder="Search clients..." value={search} onChangeText={setSearch} /></View>
        <TouchableOpacity style={[s.fltBtn, showFilters && s.fltBtnOn]} onPress={() => setShowFilters((v) => !v)} accessibilityRole="button" accessibilityLabel="Toggle filters">
          <Ionicons name="options-outline" size={20} color={showFilters ? theme.colors.textInverse : theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={s.fltRow}>
          {FILTERS.map((o) => (
            <TouchableOpacity key={o.key} style={[s.pill, filter === o.key && s.pillOn]} onPress={() => setFilter(o.key)}
              accessibilityRole="button" accessibilityState={{ selected: filter === o.key }}>
              <Text style={[s.pillTxt, filter === o.key && s.pillTxtOn]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && <View style={s.err}><Text style={s.errTxt}>{error}</Text></View>}

      <FlatList data={filtered} keyExtractor={(i) => i.id} renderItem={renderCard}
        ListEmptyComponent={search || filter !== 'all'
          ? <View style={s.empty}><Text style={s.emptyH}>No matches</Text><Text style={s.emptyP}>Try adjusting your search or filters</Text></View>
          : emptyState()}
        contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.textPrimary} colors={[theme.colors.textPrimary]} />}
      />
    </View>
  );
};

const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  android: { elevation: 2 },
}) as Record<string, unknown>;

const s = StyleSheet.create({
  root: { flex: 1 },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: theme.colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hdrTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  sumBar: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  sumTxt: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary, textAlign: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 10 },
  fltBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  fltBtnOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  fltRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 24, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  pillOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillTxt: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  pillTxtOn: { color: theme.colors.textInverse },
  err: { marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: '#FEF2F2' },
  errTxt: { fontSize: 13, color: '#DC2626', textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 32, flexGrow: 1 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, ...shadow },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.backgroundSecondary },
  avatarFb: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary },
  info: { flex: 1, marginLeft: 12, marginRight: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  badge: { backgroundColor: theme.colors.backgroundSecondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 },
  actBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIco: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyH: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  emptyP: { fontSize: 14, fontWeight: '400', color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 40, marginBottom: 28 },
  cta: { backgroundColor: theme.colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24 },
  ctaTxt: { color: theme.colors.textInverse, fontSize: 16, fontWeight: '700' },
});

export default CRMDashboardScreen;
