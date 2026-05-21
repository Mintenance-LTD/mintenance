/**
 * InvoiceManagementScreen — Mint Editorial redesign per
 * redesign-v2 contractor business deck screen 03 "Invoices".
 *
 * Changes from the previous green-accent-bar layout:
 *   - Paper background; serif "Invoices" headline with eyebrow + sub
 *     showing total count and unpaid £-amount.
 *   - Four filter chips: All / Unpaid / Paid / Drafts (dark selected).
 *     The legacy 5 chips collapsed "sent + overdue" into "Unpaid"
 *     because that's how contractors think about the bucket.
 *   - Rows are minimal cards: doc icon, two lines (client + meta),
 *     amount on the right. Rows in the "Unpaid" + "Overdue" status
 *     get a brand-coloured left border (the deck's "pending sign-off"
 *     treatment). Per-row Send / Paid / Delete actions stay.
 *   - Floating mint + FAB bottom-right replaces the legacy add icon
 *     in the header bar.
 *   - Every colour resolves from `me.*` tokens — no literal hex.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
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
import { styles as s } from './invoice-management/styles';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<JobsStackParamList>,
  NativeStackNavigationProp<ProfileStackParamList>
>;

type FilterKey = 'all' | 'unpaid' | 'paid' | 'drafts';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'paid', label: 'Paid' },
  { key: 'drafts', label: 'Drafts' },
];

// Status → (eyebrow label, left-rail accent token). Overdue keeps the
// red treatment because it is the one bucket where the contractor
// is owed money *past* its due date.
const STATUS_META: Record<
  string,
  { label: string; fg: string; bg: string; railColor: string }
> = {
  draft: { label: 'Draft', fg: me.ink2, bg: me.bg2, railColor: me.line },
  sent: { label: 'Sent', fg: me.infoFg, bg: me.infoBg, railColor: me.brand },
  overdue: {
    label: 'Overdue',
    fg: me.errFg,
    bg: me.errBg,
    railColor: me.errFg,
  },
  paid: { label: 'Paid', fg: me.okFg, bg: me.okBg, railColor: me.okFg },
  cancelled: {
    label: 'Cancelled',
    fg: me.ink3,
    bg: me.bg2,
    railColor: me.line,
  },
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const fmtGBP = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

const matchesFilter = (status: string, filter: FilterKey): boolean => {
  if (filter === 'all') return true;
  if (filter === 'unpaid') return status === 'sent' || status === 'overdue';
  if (filter === 'paid') return status === 'paid';
  if (filter === 'drafts') return status === 'draft';
  return false;
};

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
      const result = await mobileApiClient.get<{ invoices: Invoice[] }>(
        '/api/contractor/invoices?limit=200'
      );
      return result?.invoices ?? [];
    },
    enabled: !!user,
  });

  const filtered = useMemo(
    () => invoices.filter((i) => matchesFilter(i.status, filter)),
    [invoices, filter]
  );
  const unpaidTotal = useMemo(
    () =>
      invoices
        .filter((i) => i.status === 'sent' || i.status === 'overdue')
        .reduce((s, i) => s + i.total_amount, 0),
    [invoices]
  );

  const markPaid = useCallback(
    (inv: Invoice) => {
      Alert.alert(
        'Mark as paid',
        `Mark invoice #${inv.invoice_number} as paid?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark paid',
            onPress: async () => {
              try {
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
      Alert.alert('Delete invoice', `Delete invoice #${inv.invoice_number}?`, [
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
      const meta = STATUS_META[item.status] ?? STATUS_META.draft!;
      const dateLabel =
        item.status === 'paid' && item.paid_date
          ? `Paid ${fmtDate(item.paid_date)}`
          : `Due ${fmtDate(item.due_date)}`;
      const canAct = item.status !== 'paid' && item.status !== 'cancelled';
      const showRail = item.status === 'sent' || item.status === 'overdue';

      return (
        <TouchableOpacity
          style={[
            s.card,
            showRail && {
              borderLeftWidth: 3,
              borderLeftColor: meta.railColor,
            },
          ]}
          activeOpacity={0.78}
          onPress={() =>
            navigation.navigate('InvoiceDetail', { invoiceId: item.id })
          }
          accessibilityRole='button'
          accessibilityLabel={`Invoice ${item.invoice_number}`}
        >
          <View style={s.cardIcon}>
            <Ionicons name='document-text-outline' size={20} color={me.ink2} />
          </View>
          <View style={s.cardBody}>
            <View style={s.row}>
              <Text style={s.client} numberOfLines={1}>
                {item.client_name || 'Client'}
              </Text>
              <Text style={s.amount}>{fmtGBP(item.total_amount)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.invNum} numberOfLines={1}>
                #{item.invoice_number} · {dateLabel}
              </Text>
              <View style={[s.badge, { backgroundColor: meta.bg }]}>
                <Text style={[s.badgeText, { color: meta.fg }]}>
                  {meta.label}
                </Text>
              </View>
            </View>
            {canAct ? (
              <View style={s.actions}>
                <TouchableOpacity
                  style={s.actBtn}
                  onPress={() => markPaid(item)}
                  accessibilityRole='button'
                  accessibilityLabel={`Mark invoice ${item.invoice_number} paid`}
                >
                  <Ionicons
                    name='checkmark-circle-outline'
                    size={14}
                    color={me.brand}
                  />
                  <Text style={[s.actText, { color: me.brand }]}>Paid</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.actBtn}
                  onPress={() => deleteInv(item)}
                  accessibilityRole='button'
                  accessibilityLabel={`Delete invoice ${item.invoice_number}`}
                >
                  <Ionicons name='trash-outline' size={14} color={me.errFg} />
                  <Text style={[s.actText, { color: me.errFg }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, markPaid, deleteInv]
  );

  if (isLoading) {
    return (
      <View style={[s.loadingScreen, { paddingTop: insets.top }]}>
        <LoadingSpinner message='Loading invoices…' />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.topNav}>
        {navigation.canGoBack() ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
            accessibilityRole='button'
            accessibilityLabel='Go back'
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name='arrow-back' size={20} color={me.ink} />
          </TouchableOpacity>
        ) : (
          <View style={s.backBtn} />
        )}
      </View>

      <View style={s.screenHeader}>
        <Text style={s.eyebrow}>Invoices</Text>
        <Text style={s.headline}>Invoices</Text>
        <Text style={s.sub}>
          {invoices.length} total · {fmtGBP(unpaidTotal)} unpaid
        </Text>
      </View>

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
                size={32}
                color={me.ink3}
              />
            </View>
            <Text style={s.emptyTitle}>No invoices yet</Text>
            <Text style={s.emptyDesc}>
              Tap the + button to bill your first job.
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[s.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => navigation.navigate('CreateInvoice')}
        accessibilityRole='button'
        accessibilityLabel='Create new invoice'
        activeOpacity={0.82}
      >
        <Ionicons name='add' size={24} color={me.onBrand} />
      </TouchableOpacity>
    </View>
  );
};
