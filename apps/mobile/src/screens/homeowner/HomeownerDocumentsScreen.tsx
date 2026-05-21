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
import { me } from '../../design-system/mint-editorial';
import { formatCurrency } from '../../utils/formatCurrency';
import { styles } from '../contractor/DocumentsStyles';
import { DocIcon } from '../../components/documents/DocIcon';

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

// Spec-locked doc-type palette mirroring `--me-doc-*` in
// apps/web/styles/mint-editorial.css. Picked from
// redesign-v2/documents-web.html so each type reads at a glance:
//   Contract → deep purple, Bid → magenta, Payment → teal.
// `fileLabel` is the extension chip on the paper-shape DocIcon —
// contracts and payment receipts are PDFs, bids carry a "BID" chip.
const TYPE_STYLE: Record<
  DocType,
  {
    color: string;
    bg: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    fileLabel: string;
  }
> = {
  contract: {
    color: me.doc.contractFg,
    bg: me.doc.contractBg,
    icon: 'document-text',
    label: 'Contract',
    fileLabel: 'PDF',
  },
  bid: {
    color: me.doc.bidFg,
    bg: me.doc.bidBg,
    icon: 'hammer',
    label: 'Bid',
    fileLabel: 'BID',
  },
  payment: {
    color: me.doc.paymentFg,
    bg: me.doc.paymentBg,
    icon: 'card',
    label: 'Payment',
    fileLabel: 'PDF',
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

// Status badge — bg + fg pair from the Mint Editorial status tokens.
// Mirrors statusBadge() in apps/web/app/documents/components/DocumentCard.tsx
// so the homeowner sees the same labels and colour weights on mobile
// and web.
interface BadgeStyle {
  label: string;
  bg: string;
  fg: string;
}

function getStatusBadge(
  type: DocType,
  status: string,
  contractorSigned?: boolean,
  homeownerSigned?: boolean
): BadgeStyle {
  if (type === 'contract') {
    if (status === 'accepted' || (contractorSigned && homeownerSigned)) {
      return { label: 'Fully signed', bg: me.doc.certBg, fg: me.doc.certFg };
    }
    if (status === 'pending_homeowner') {
      return {
        label: 'Awaiting you',
        bg: me.doc.paymentBg,
        fg: me.doc.paymentFg,
      };
    }
    if (status === 'pending_contractor') {
      return {
        label: 'Awaiting contractor',
        bg: me.doc.receiptBg,
        fg: me.doc.receiptFg,
      };
    }
    if (status === 'rejected' || status === 'cancelled') {
      return {
        label: status === 'rejected' ? 'Rejected' : 'Cancelled',
        bg: me.errBg,
        fg: me.errFg,
      };
    }
    return { label: status, bg: me.bg2, fg: me.ink2 };
  }
  if (type === 'bid') {
    if (status === 'accepted') {
      return { label: 'Accepted', bg: me.doc.certBg, fg: me.doc.certFg };
    }
    if (status === 'pending') {
      return { label: 'Pending review', bg: me.doc.bidBg, fg: me.doc.bidFg };
    }
    if (status === 'rejected' || status === 'declined') {
      return { label: 'Declined', bg: me.errBg, fg: me.errFg };
    }
    return { label: status, bg: me.bg2, fg: me.ink2 };
  }
  // Payment
  if (status === 'released' || status === 'completed') {
    return { label: 'Released', bg: me.doc.certBg, fg: me.doc.certFg };
  }
  if (status === 'held' || status === 'in_escrow') {
    return { label: 'In escrow', bg: me.doc.receiptBg, fg: me.doc.receiptFg };
  }
  if (status === 'release_pending')
    return { label: 'Release pending', bg: me.warnBg, fg: me.warnFg };
  if (status === 'pending')
    return { label: 'Processing', bg: me.warnBg, fg: me.warnFg };
  if (status === 'refunded')
    return { label: 'Refunded', bg: me.bg2, fg: me.ink2 };
  return { label: status, bg: me.bg2, fg: me.ink2 };
}

function isAwaiting(doc: DocumentItem): boolean {
  return (
    (doc.type === 'contract' && doc.status === 'pending_homeowner') ||
    (doc.type === 'bid' && doc.status === 'pending')
  );
}

function awaitingPrimaryLabel(type: DocType): string | null {
  if (type === 'contract') return 'Review & sign →';
  if (type === 'bid') return 'Review bid →';
  return null;
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
            tintColor={me.onBrand}
            colors={[me.brand]}
            progressViewOffset={140}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Hero */}
            <LinearGradient
              colors={[me.brand2, me.brand] as const}
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
                  <Ionicons name='arrow-back' size={20} color={me.onBrand} />
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
                        backgroundColor: me.warnBg,
                        borderColor: me.accent,
                      },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: me.accent }]}>
                      {needsAttention}
                    </Text>
                    <Text style={[styles.statLabel, { color: me.accent }]}>
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
                <Ionicons name='search' size={16} color={me.ink3} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder='Search by name, contractor, or job…'
                  placeholderTextColor={me.ink3}
                  style={localStyles.searchInput}
                  returnKeyType='search'
                  clearButtonMode='while-editing'
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name='close-circle' size={18} color={me.ink3} />
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
                      color={active ? me.onBrand : me.ink2}
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
              <Ionicons name='folder-open-outline' size={32} color={me.brand} />
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
          const badge = getStatusBadge(
            item.type,
            item.status,
            item.contractor_signed,
            item.homeowner_signed
          );
          const awaiting = isAwaiting(item);
          const primaryLabel = awaitingPrimaryLabel(item.type);
          // Awaiting cards get the spec's `.attn` treatment — full
          // brand-coloured border + a soft brand shadow — so they pop
          // visibly from the rest of the grid. Non-awaiting cards keep
          // the type-coloured left accent.
          return (
            <TouchableOpacity
              style={[styles.docCard, awaiting && localStyles.docCardAwaiting]}
              activeOpacity={0.7}
              onPress={() => openDoc(item)}
            >
              <View
                style={[
                  styles.docAccent,
                  { backgroundColor: awaiting ? me.brand : ts.color },
                ]}
              />
              <View style={styles.docContent}>
                <View style={styles.docTopRow}>
                  <DocIcon color={ts.color} bg={ts.bg} ext={ts.fileLabel}>
                    <Ionicons name={ts.icon} size={22} color={ts.color} />
                  </DocIcon>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.docMeta}>
                      <View
                        style={[
                          styles.categoryPill,
                          { backgroundColor: badge.bg },
                        ]}
                      >
                        <Text
                          style={[styles.categoryPillText, { color: badge.fg }]}
                        >
                          {badge.label}
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
                      color={me.ink3}
                    />
                  </View>
                </View>

                {/* Awaiting action chips — spec lock from
                    redesign-v2/documents-web.html. Mirrors the
                    `awaiting && primaryLabel` block on the web
                    DocumentCard. The chips don't capture their own
                    press: tapping the card already routes to the
                    contract/bid review surface. */}
                {awaiting && primaryLabel ? (
                  <View style={localStyles.actionRow}>
                    <View style={localStyles.actionPrimary}>
                      <Text style={localStyles.actionPrimaryText}>
                        {primaryLabel}
                      </Text>
                    </View>
                    <View style={localStyles.actionGhost}>
                      <Text style={localStyles.actionGhostText}>
                        Remind me later
                      </Text>
                    </View>
                  </View>
                ) : null}
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
    backgroundColor: me.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: me.line,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: me.ink,
    paddingVertical: 0,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: me.ink,
  },
  // Awaiting (.attn) card treatment — matches the homeowner DocumentCard
  // spec on web: brand border + soft brand shadow lift the card off the
  // grid so users notice items that need their input.
  docCardAwaiting: {
    borderWidth: 1,
    borderColor: me.brand,
    ...me.shadow.pop,
  },
  // Action chip row — appears under awaiting cards. Mirrors the dashed
  // top border + "Review & sign →" + "Remind me later" pair on web.
  actionRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: me.line2,
  },
  actionPrimary: {
    backgroundColor: me.brand,
    borderRadius: me.radius.btn,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionPrimaryText: {
    color: me.onBrand,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  actionGhost: {
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: me.radius.btn,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionGhostText: {
    color: me.ink2,
    fontSize: 13,
    fontWeight: '600' as const,
  },
};

export default HomeownerDocumentsScreen;
