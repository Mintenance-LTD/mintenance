/**
 * ClientDetailScreen — Mint Editorial contractor-side view of a single
 * client. Reference: redesign-v2 / contractor-mobile-audit.html screen 04
 * "Customer profile".
 *
 * Horizontal profile (avatar + serif name + meta line), trio of stats
 * (sign-off rate / avg reply / avg job), Mint-tinted insight note
 * (only when there's a real signal — no fake AI text), property card
 * with access info pulled from the most-recent job, and a list of past
 * work together fetched from supabase.
 *
 * Receives the basic client summary via route params from CRMDashboard.
 * Hydrates with a per-client jobs query at mount.
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { supabase } from '../../config/supabase';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import type {
  ProfileStackParamList,
  RootTabParamList,
} from '../../navigation/types';
import { goToMessagingThread } from '../../navigation/hooks';
import { me } from '../../design-system/mint-editorial';
import { styles } from './styles';

interface ClientData {
  client_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  relationship_status: string;
  total_jobs: number;
  total_revenue?: number;
  satisfaction_score?: number;
  last_job_date?: string;
  last_job_title?: string;
}

interface PastJobRow {
  id: string;
  title: string | null;
  status: string;
  budget: number | null;
  // 2026-05-23 audit: `final_price` does not exist on live jobs (only
  // budget / budget_min / budget_max). Selecting it errored the whole
  // query and silently returned [] via the catch — past-work tile
  // would disappear from every client profile. Field dropped; the
  // "Past work together" list now reads `budget` only. A long-term
  // fix would JOIN escrow_transactions for the realised amount.
  location: string | null;
  description: string | null;
  category: string | null;
  created_at: string;
  completed_at: string | null;
}

interface ClientDetailScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ClientDetail'>;
  route: RouteProp<ProfileStackParamList, 'ClientDetail'>;
}

const fmtGBP = (n: number): string =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const initialsFor = (a: string, b: string): string =>
  `${a.charAt(0)}${b.charAt(0)}`.toUpperCase() || '??';

const yearOf = (iso?: string | null): number | null => {
  if (!iso) return null;
  const y = new Date(iso).getFullYear();
  return Number.isFinite(y) ? y : null;
};

export const ClientDetailScreen: React.FC<ClientDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();
  const tabNavigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { client: rawClient } = route.params;
  const client = rawClient as unknown as ClientData;

  const fullName = `${client.first_name} ${client.last_name}`.trim();
  const initials = initialsFor(client.first_name, client.last_name);

  // Fetch every job between this contractor and this client to power
  // the "Past work together" list, the property card, and the
  // sign-off-rate stat.
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['client-jobs', user?.id, client.client_id],
    queryFn: async (): Promise<PastJobRow[]> => {
      if (!user?.id || !client.client_id) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select(
          'id, title, status, budget, location, description, category, created_at, completed_at'
        )
        .eq('contractor_id', user.id)
        .eq('homeowner_id', client.client_id)
        .order('created_at', { ascending: false });
      if (error) {
        // The screen still renders fine without this — fall back gracefully.
        return [];
      }
      return (data ?? []) as PastJobRow[];
    },
    enabled: !!user?.id && !!client.client_id,
  });

  // Derived stats — keep these honest, only render when we actually
  // have signal (otherwise show an em-dash).
  const completedJobs = useMemo(
    () => jobs.filter((j) => j.status === 'completed').length,
    [jobs]
  );
  const signOffRate = useMemo(() => {
    const eligible = jobs.filter(
      (j) => j.status === 'completed' || j.status === 'cancelled'
    ).length;
    if (eligible === 0) return null;
    return Math.round((completedJobs / eligible) * 100);
  }, [jobs, completedJobs]);
  const avgJob = useMemo(() => {
    const priced = jobs.filter((j) => (j.budget ?? 0) > 0);
    if (priced.length === 0) {
      if (client.total_revenue && client.total_jobs > 0) {
        return Math.round(client.total_revenue / client.total_jobs);
      }
      return null;
    }
    const sum = priced.reduce((s, j) => s + (j.budget ?? 0), 0);
    return Math.round(sum / priced.length);
  }, [jobs, client.total_revenue, client.total_jobs]);

  const sinceYear = useMemo(() => {
    const oldest = [...jobs].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    return yearOf(oldest?.created_at) ?? yearOf(client.last_job_date);
  }, [jobs, client.last_job_date]);

  const latestJob = jobs[0];
  const propertyLocation = latestJob?.location ?? null;
  const propertyAccessNote = useMemo(() => {
    // Quick heuristic: surface description snippets that mention access
    // ("key safe", "lockbox", "code", "side gate") — these are the
    // honest hints contractors actually need on-site.
    const desc = latestJob?.description ?? '';
    const lines = desc.split(/\n+/);
    const match = lines.find((l) =>
      /key\s?safe|lockbox|access|code|side gate|alarm|cat|dog/i.test(l)
    );
    return match ? match.trim() : null;
  }, [latestJob]);

  // Mint note — show only when we have a real, contractor-specific
  // signal worth surfacing. Currently: high repeat custom + ≥1 paid
  // job. Otherwise the note is omitted (no hardcoded fluff).
  const mintNote = useMemo(() => {
    if (completedJobs >= 3 && signOffRate !== null && signOffRate >= 80) {
      return `${client.first_name} usually signs off ${signOffRate}% of jobs without changes. You can ship faster here than your average customer.`;
    }
    if (completedJobs >= 2 && avgJob && avgJob >= 200) {
      return `${client.first_name} averages ${fmtGBP(avgJob)} per booking — worth keeping warm.`;
    }
    return null;
  }, [completedJobs, signOffRate, avgJob, client.first_name]);

  const handleCall = async () => {
    if (!client.phone) {
      toast.error(
        'No phone number',
        'This client has no phone number on record.'
      );
      return;
    }
    const url = `tel:${client.phone}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot make phone call');
    }
  };

  const handleEmail = async () => {
    const url = `mailto:${client.email}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open email client');
    }
  };

  const handleMessage = () => {
    goToMessagingThread(tabNavigation, {
      conversationId: client.client_id,
      recipientId: client.client_id,
      recipientName: fullName,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name='arrow-back' size={20} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {fullName || 'Client'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Math.max(insets.bottom, 24) + 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile row */}
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{fullName || 'Client'}</Text>
            <Text style={styles.profileLine}>
              {[
                client.satisfaction_score
                  ? `★ ${client.satisfaction_score.toFixed(1)}`
                  : null,
                sinceYear ? `since ${sinceYear}` : null,
                client.total_jobs
                  ? `${client.total_jobs} job${client.total_jobs === 1 ? '' : 's'}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </View>

        {/* Quick contact actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleMessage}
            accessibilityRole='button'
            accessibilityLabel='Message client'
          >
            <Ionicons name='chatbubble-outline' size={16} color={me.brand} />
            <Text style={styles.actionLabel}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleCall}
            accessibilityRole='button'
            accessibilityLabel='Call client'
          >
            <Ionicons name='call-outline' size={16} color={me.brand} />
            <Text style={styles.actionLabel}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleEmail}
            accessibilityRole='button'
            accessibilityLabel='Email client'
          >
            <Ionicons name='mail-outline' size={16} color={me.brand} />
            <Text style={styles.actionLabel}>Email</Text>
          </TouchableOpacity>
        </View>

        {/* Stat trio */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {signOffRate !== null ? `${signOffRate}%` : '—'}
            </Text>
            <Text style={styles.statLabel}>Sign-off rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{client.total_jobs || 0}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {avgJob !== null ? fmtGBP(avgJob) : '—'}
            </Text>
            <Text style={styles.statLabel}>Avg job</Text>
          </View>
        </View>

        {/* Mint note — only when we have a real, contractor-specific
            signal. No fake "tips on 6 out of 14" copy. */}
        {mintNote ? (
          <View style={styles.mintNote}>
            <Text style={styles.mintNoteBody}>
              <Text style={styles.mintNoteLabel}>Mint note · </Text>
              {mintNote}
            </Text>
          </View>
        ) : null}

        {/* Property */}
        {propertyLocation ? (
          <>
            <Text style={styles.sectionEyebrow}>Property</Text>
            <View style={styles.propertyCard}>
              <Text style={styles.propertyAddress}>{propertyLocation}</Text>
              {latestJob?.category ? (
                <Text style={styles.propertySub}>
                  Most recent: {latestJob.title || latestJob.category}
                </Text>
              ) : null}
              {propertyAccessNote ? (
                <View style={styles.accessBlock}>
                  <Text style={styles.accessLabel}>Access · </Text>
                  <Text style={styles.accessBody}>{propertyAccessNote}</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {/* Past work together */}
        <Text style={styles.sectionEyebrow}>
          Past work together{jobs.length > 0 ? ` · ${jobs.length}` : ''}
        </Text>
        {jobsLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size='small' color={me.brand} />
          </View>
        ) : jobs.length === 0 ? (
          <Text style={styles.emptyLine}>
            No jobs together yet — when one lands, it’ll appear here.
          </Text>
        ) : (
          jobs.slice(0, 6).map((job, idx) => {
            const price = job.budget ?? null;
            const when = job.completed_at ?? job.created_at;
            const monthYear = new Date(when).toLocaleDateString('en-GB', {
              month: 'short',
              year: 'numeric',
            });
            return (
              <View
                key={job.id}
                style={[styles.jobRow, idx === 0 && styles.jobRowFirst]}
              >
                <View style={styles.jobRowBody}>
                  <Text style={styles.jobRowTitle} numberOfLines={1}>
                    {job.title || 'Untitled job'}
                  </Text>
                  <Text style={styles.jobRowMeta}>
                    {[
                      monthYear,
                      job.status === 'completed'
                        ? 'completed'
                        : job.status.replace(/_/g, ' '),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Text style={styles.jobRowPrice}>
                  {price !== null ? fmtGBP(price) : '—'}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default ClientDetailScreen;
