import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { theme, gradients } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { styles } from '../contractor/DocumentsStyles';
import {
  colors as designColors,
  STATUS_COLORS,
} from '@mintenance/design-tokens';

type DocType = 'contract' | 'bid' | 'payment';
type TabKey = 'all' | 'contracts' | 'bids' | 'payments';

interface DocumentItem {
  id: string;
  type: DocType;
  name: string;
  status: string;
  amount: number | null;
  job_id: string;
  job_title?: string;
  contractor_name?: string;
  contractor_signed?: boolean;
  homeowner_signed?: boolean;
  message?: string | null;
  created_at: string;
  updated_at: string;
  href: string;
}

interface DocumentsApiResponse {
  documents: DocumentItem[];
  counts: { contracts: number; bids: number; payments: number; total: number };
}

const TYPE_STYLE: Record<
  DocType,
  {
    color: string;
    bg: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  contract: {
    color: theme.colors.primary,
    bg: theme.colors.primaryLight,
    icon: 'document-text',
    label: 'Contract',
  },
  bid: {
    color: STATUS_COLORS.assigned.text,
    bg: STATUS_COLORS.assigned.bg,
    icon: 'hammer',
    label: 'Bid',
  },
  payment: {
    color: STATUS_COLORS.posted.text,
    bg: STATUS_COLORS.posted.bg,
    icon: 'card',
    label: 'Payment',
  },
};

const TABS: {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'contracts', label: 'Contracts', icon: 'document-text-outline' },
  { key: 'bids', label: 'Bids', icon: 'hammer-outline' },
  { key: 'payments', label: 'Payments', icon: 'card-outline' },
];

function getStatusLabel(
  type: DocType,
  status: string
): { label: string; color: string } {
  if (type === 'contract') {
    if (status === 'accepted')
      return { label: 'Fully Signed', color: designColors.success };
    if (status === 'pending_homeowner')
      return { label: 'Awaiting You', color: designColors.info };
    if (status === 'pending_contractor')
      return { label: 'Awaiting Contractor', color: designColors.warning };
    if (status === 'rejected')
      return { label: 'Rejected', color: designColors.error };
    return { label: status, color: theme.colors.textSecondary };
  }
  if (type === 'bid') {
    if (status === 'accepted')
      return { label: 'Accepted', color: designColors.success };
    if (status === 'pending')
      return { label: 'Pending Review', color: designColors.warning };
    if (status === 'rejected')
      return { label: 'Declined', color: designColors.error };
    return { label: status, color: theme.colors.textSecondary };
  }
  if (status === 'held')
    return { label: 'In Escrow', color: designColors.info };
  if (status === 'released' || status === 'completed')
    return { label: 'Released', color: designColors.success };
  if (status === 'release_pending')
    return { label: 'Release Pending', color: designColors.warning };
  if (status === 'pending')
    return { label: 'Processing', color: designColors.warning };
  if (status === 'refunded')
    return { label: 'Refunded', color: theme.colors.textSecondary };
  return { label: status, color: theme.colors.textSecondary };
}

function formatRelative(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const HomeownerDocumentsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['homeowner-documents', user?.id],
    queryFn: () => mobileApiClient.get<DocumentsApiResponse>('/api/documents'),
    enabled: !!user?.id,
  });

  const documents = data?.documents ?? [];
  const counts = data?.counts ?? {
    contracts: 0,
    bids: 0,
    payments: 0,
    total: 0,
  };

  const needsAttention = useMemo(
    () =>
      documents.filter(
        (d) =>
          (d.type === 'contract' && d.status === 'pending_homeowner') ||
          (d.type === 'bid' && d.status === 'pending')
      ).length,
    [documents]
  );

  const filtered = useMemo(() => {
    let docs = documents;
    if (tab !== 'all') {
      const map: Record<Exclude<TabKey, 'all'>, DocType> = {
        contracts: 'contract',
        bids: 'bid',
        payments: 'payment',
      };
      docs = docs.filter((d) => d.type === map[tab]);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.contractor_name?.toLowerCase().includes(q) ||
          d.job_title?.toLowerCase().includes(q) ||
          d.status.toLowerCase().includes(q)
      );
    }
    return docs;
  }, [documents, tab, search]);

  const tabCount = (key: TabKey): number => {
    if (key === 'all') return counts.total;
    if (key === 'contracts') return counts.contracts;
    if (key === 'bids') return counts.bids;
    return counts.payments;
  };

  const openDoc = (doc: DocumentItem) => {
    if (doc.type === 'payment') {
      // Payments go to the financials screen
      (navigation as ReturnType<typeof Object>).navigate('Financials');
      return;
    }
    if (doc.job_id) {
      (navigation as ReturnType<typeof Object>).navigate('JobsTab', {
        screen: 'JobDetails',
        params: { jobId: doc.job_id },
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle='light-content' />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={theme.colors.textInverse}
            colors={[theme.colors.primary]}
            progressViewOffset={140}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Hero */}
            <LinearGradient
              colors={gradients.heroGreen}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.hero, { paddingTop: insets.top + 12 }]}
            >
              <View style={styles.decor1} />
              <View style={styles.decor2} />

              <View style={styles.heroNav}>
                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => navigation.goBack()}
                  accessibilityRole='button'
                  accessibilityLabel='Go back'
                >
                  <Ionicons
                    name='arrow-back'
                    size={20}
                    color={theme.colors.textInverse}
                  />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.heroTitle}>Documents</Text>
                  <Text style={styles.heroSubtitle}>
                    Contracts, bids, and payment records
                  </Text>
                </View>
              </View>

              <View style={styles.statRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statValue}>{counts.total}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statValue}>{counts.contracts}</Text>
                  <Text style={styles.statLabel}>Contracts</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statValue}>{counts.bids}</Text>
                  <Text style={styles.statLabel}>Bids</Text>
                </View>
                {needsAttention > 0 ? (
                  <View
                    style={[
                      styles.statPill,
                      {
                        backgroundColor: theme.colors.accentLight,
                        borderColor: theme.colors.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.statValue, { color: theme.colors.accent }]}
                    >
                      {needsAttention}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: theme.colors.accent }]}
                    >
                      Action
                    </Text>
                  </View>
                ) : (
                  <View style={styles.statPill}>
                    <Text style={styles.statValue}>{counts.payments}</Text>
                    <Text style={styles.statLabel}>Payments</Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            {/* Search */}
            <View style={localStyles.searchWrap}>
              <View style={localStyles.searchBox}>
                <Ionicons
                  name='search'
                  size={16}
                  color={theme.colors.textTertiary}
                />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder='Search by name, contractor, or job…'
                  placeholderTextColor={theme.colors.textTertiary}
                  style={localStyles.searchInput}
                  returnKeyType='search'
                  clearButtonMode='while-editing'
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons
                      name='close-circle'
                      size={18}
                      color={theme.colors.textTertiary}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {TABS.map((t) => {
                const active = tab === t.key;
                const count = tabCount(t.key);
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() => setTab(t.key)}
                    accessibilityRole='button'
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons
                      name={t.icon}
                      size={14}
                      color={
                        active
                          ? theme.colors.textInverse
                          : theme.colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                    {count > 0 && (
                      <View
                        style={[
                          styles.chipBadge,
                          active && styles.chipBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipBadgeText,
                            active && styles.chipBadgeTextActive,
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.resultsRow}>
              <Text style={styles.resultsText}>
                {filtered.length}{' '}
                {filtered.length === 1 ? 'document' : 'documents'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name='folder-open-outline'
                size={32}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {error
                ? 'Could not load documents'
                : search
                  ? 'No results'
                  : 'No documents yet'}
            </Text>
            <Text style={styles.emptyDesc}>
              {error
                ? 'Pull down to retry. If this keeps happening, check your connection.'
                : search
                  ? 'Try a different search term or clear filters.'
                  : 'Documents appear here as you post jobs and receive bids.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const ts = TYPE_STYLE[item.type];
          const status = getStatusLabel(item.type, item.status);
          return (
            <TouchableOpacity
              style={styles.docCard}
              activeOpacity={0.7}
              onPress={() => openDoc(item)}
            >
              <View style={[styles.docAccent, { backgroundColor: ts.color }]} />
              <View style={styles.docContent}>
                <View style={styles.docTopRow}>
                  <View
                    style={[styles.docIconWrap, { backgroundColor: ts.bg }]}
                  >
                    <Ionicons name={ts.icon} size={20} color={ts.color} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.docMeta}>
                      <View
                        style={[
                          styles.categoryPill,
                          { backgroundColor: status.color + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            { color: status.color },
                          ]}
                        >
                          {status.label}
                        </Text>
                      </View>
                      {item.contractor_name ? (
                        <Text style={styles.docDate} numberOfLines={1}>
                          {item.contractor_name}
                        </Text>
                      ) : null}
                      <Text style={styles.docDate}>
                        {formatRelative(item.created_at)}
                      </Text>
                    </View>
                    {item.type === 'bid' && item.message ? (
                      <Text
                        style={[
                          styles.docDate,
                          { fontStyle: 'italic', marginTop: 4 },
                        ]}
                        numberOfLines={1}
                      >
                        “{item.message}”
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.docActions}>
                    {item.amount != null && item.amount > 0 ? (
                      <Text style={localStyles.amount}>
                        {formatCurrency(Number(item.amount))}
                      </Text>
                    ) : null}
                    <Ionicons
                      name='chevron-forward'
                      size={16}
                      color={theme.colors.textTertiary}
                    />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const localStyles = {
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.textPrimary,
  },
};

export default HomeownerDocumentsScreen;
