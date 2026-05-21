import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { mobileApiClient } from '../utils/mobileApiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { Invoice } from '../services/contractor-business';
import type {
  JobsStackParamList,
  ProfileStackParamList,
} from '../navigation/types';
import { me } from '../design-system/mint-editorial';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<JobsStackParamList>,
  NativeStackNavigationProp<ProfileStackParamList>
>;
type FilterKey = 'all' | 'draft' | 'sent' | 'overdue' | 'paid';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
];
const ACCENT: Record<string, string> = {
  draft: '#9CA3AF',
  sent: '#3B82F6',
  overdue: '#EF4444',
  paid: '#10B981',
};
const BADGE_BG: Record<string, string> = {
  draft: '#F3F4F6',
  sent: '#DBEAFE',
  overdue: '#FEE2E2',
  paid: '#D1FAE5',
};
const BADGE_FG: Record<string, string> = {
  draft: '#6B7280',
  sent: '#1D4ED8',
  overdue: '#DC2626',
  paid: '#059669',
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const fmtGBP = (n: number) =>
  `\u00A3${n.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

export const InvoiceManagementScreen: React.FC<{ navigation: Nav }> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>('all');

  const {
    data: invoices = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['invoices', user?.id],
    queryFn: async () => {
      // 2026-04-30 audit P0-1: was reading from supabase.from('invoices')
      // directly. Route through the API so RLS, role checks, and any
      // future side effects (PDF caching, notifications, audit logs)
      // stay in one place.
      const result = await mobileApiClient.get<{ invoices: Invoice[] }>(
        '/api/contractor/invoices?limit=200'
      );
      return result?.invoices ?? [];
    },
    enabled: !!user,
  });

  const filtered = useMemo(
    () =>
      filter === 'all' ? invoices : invoices.filter((i) => i.status === filter),
    [invoices, filter]
  );
  const outstanding = useMemo(
    () =>
      invoices
        .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
        .reduce((s, i) => s + i.total_amount, 0),
    [invoices]
  );
  const paidTotal = useMemo(
    () =>
      invoices
        .filter((i) => i.status === 'paid')
        .reduce((s, i) => s + i.total_amount, 0),
    [invoices]
  );

  const markPaid = useCallback(
    (inv: Invoice) => {
      Alert.alert(
        'Mark as Paid',
        `Mark invoice #${inv.invoice_number} as paid?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark Paid',
            onPress: async () => {
              try {
                // 2026-04-30 audit P0-1: canonical PATCH endpoint takes
                // the invoice id as a query param, not a path segment.
                // The path-segment URL was 404'ing silently.
                await mobileApiClient.patch(
                  `/api/contractor/invoices?id=${encodeURIComponent(inv.id)}`,
                  { status: 'paid' }
                );
                toast.success('Invoice marked as paid');
                qc.invalidateQueries({ queryKey: ['invoices'] });
              } catch {
                toast.error('Failed to update invoice');
              }
            },
          },
        ]
      );
    },
    [toast, qc]
  );

  const deleteInv = useCallback(
    (inv: Invoice) => {
      Alert.alert('Delete Invoice', `Delete invoice #${inv.invoice_number}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await mobileApiClient.delete(
                `/api/contractor/invoices?id=${encodeURIComponent(inv.id)}`
              );
              toast.success('Invoice deleted');
              qc.invalidateQueries({ queryKey: ['invoices'] });
            } catch {
              toast.error('Failed to delete invoice');
            }
          },
        },
      ]);
    },
    [toast, qc]
  );

  const renderItem = useCallback(
    ({ item }: { item: Invoice }) => {
      const accent = ACCENT[item.status] || '#9CA3AF';
      const bg = BADGE_BG[item.status] || '#F3F4F6';
      const fg = BADGE_FG[item.status] || '#6B7280';
      const dateLabel =
        item.status === 'paid' && item.paid_date
          ? `Paid: ${fmtDate(item.paid_date)}`
          : `Due: ${fmtDate(item.due_date)}`;
      const canAct = item.status !== 'paid' && item.status !== 'cancelled';
      const canSend =
        item.status === 'draft' ||
        item.status === 'sent' ||
        item.status === 'overdue';

      return (
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('InvoiceDetail', { invoiceId: item.id })
          }
          accessibilityRole='button'
          accessibilityLabel={`Invoice ${item.invoice_number}`}
        >
          <View style={[s.accentBar, { backgroundColor: accent }]} />
          <View style={s.cardBody}>
            <View style={s.row}>
              <Text style={s.client} numberOfLines={1}>
                {item.client_name || 'Client'}
              </Text>
              <View style={[s.badge, { backgroundColor: bg }]}>
                <Text style={[s.badgeText, { color: fg }]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>
            <View style={s.row}>
              <Text style={s.invNum}>#{item.invoice_number}</Text>
              <Text style={s.amount}>{fmtGBP(item.total_amount)}</Text>
            </View>
            <Text style={s.date}>{dateLabel}</Text>
            <View style={s.actions}>
              {canSend && (
                <TouchableOpacity
                  style={s.actBtn}
                  onPress={() => toast.success('Sending invoice...')}
                >
                  <Ionicons name='send-outline' size={16} color={me.ink2} />
                  <Text style={s.actText}>Send</Text>
                </TouchableOpacity>
              )}
              {canAct && (
                <TouchableOpacity
                  style={s.actBtn}
                  onPress={() => markPaid(item)}
                >
                  <Ionicons
                    name='checkmark-circle-outline'
                    size={16}
                    color={me.brand}
                  />
                  <Text style={[s.actText, { color: me.brand }]}>Paid</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={s.actBtn}
                onPress={() => deleteInv(item)}
              >
                <Ionicons name='trash-outline' size={16} color={me.errFg} />
                <Text style={[s.actText, { color: me.errFg }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, toast, markPaid, deleteInv]
  );

  if (isLoading) {
    // 2026-05-21 audit: returning <LoadingSpinner /> bare leaves the
    // container background transparent, so on devices honouring system
    // dark mode the whole screen rendered black-on-black. Anchor the
    // loading state on the Mint Editorial paper background like every
    // other invoice/finance screen.
    return (
      <View style={[s.loadingScreen, { paddingTop: insets.top }]}>
        <LoadingSpinner message='Loading invoices...' />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.hBtn}
            accessibilityRole='button'
            accessibilityLabel='Go back'
          >
            <Ionicons name='arrow-back' size={22} color={me.ink} />
          </TouchableOpacity>
        ) : (
          <View style={s.hBtn} />
        )}
        <Text style={s.hTitle}>Invoices</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateInvoice')}
          style={[s.hBtn, s.addBtn]}
          accessibilityRole='button'
          accessibilityLabel='Create new invoice'
        >
          <Ionicons name='add' size={22} color={me.onBrand} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <Text style={s.summary}>
        {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
        {' \u00B7 '}
        {fmtGBP(outstanding)} outstanding{' \u00B7 '}
        {fmtGBP(paidTotal)} paid
      </Text>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterWrap}
        contentContainerStyle={s.filterInner}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.pill, active && s.pillOn]}
              onPress={() => setFilter(f.key)}
              accessibilityRole='button'
              accessibilityState={{ selected: active }}
            >
              <Text style={[s.pillText, active && s.pillTextOn]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => refetch()}
            tintColor={me.brand}
            colors={[me.brand]}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons
                name='document-text-outline'
                size={40}
                color={me.ink3}
              />
            </View>
            <Text style={s.emptyTitle}>No invoices yet</Text>
            <Text style={s.emptyDesc}>
              Create your first invoice to start tracking payments
            </Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => navigation.navigate('CreateInvoice')}
            >
              <Text style={s.emptyBtnTxt}>Create Invoice</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const shadow = (_o: number, _r: number, _e: number) => me.shadow.card;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: me.bg2 },
  loadingScreen: {
    flex: 1,
    backgroundColor: me.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: me.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  hBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hTitle: { fontSize: 18, fontWeight: '700', color: me.ink },
  addBtn: { backgroundColor: me.brand },
  summary: {
    fontSize: 13,
    color: me.ink2,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  filterWrap: { maxHeight: 52 },
  filterInner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: me.surface,
    ...shadow(1, 4, 1),
  },
  pillOn: { backgroundColor: me.brand },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
  },
  pillTextOn: { color: me.onBrand },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    backgroundColor: me.surface,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    ...shadow(2, 10, 2),
  },
  accentBar: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  client: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
    flex: 1,
    marginRight: 8,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  invNum: { fontSize: 13, color: me.ink2 },
  amount: { fontSize: 18, fontWeight: '700', color: me.ink },
  date: { fontSize: 12, color: me.ink3 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actText: {
    fontSize: 12,
    fontWeight: '500',
    color: me.ink2,
  },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: me.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: me.brand,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 28,
  },
  emptyBtnTxt: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '600',
  },
});
