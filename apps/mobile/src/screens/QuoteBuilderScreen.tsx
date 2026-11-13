import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { formatCurrency } from '../utils/formatCurrency';
import { useAuth } from '../contexts/AuthContext';
import {
  QuoteBuilderService,
  type ContractorQuote,
  type QuoteSummaryStats,
} from '../services/QuoteBuilderService';
import { QuoteCard } from '../components/QuoteCard';
import { Banner } from '../components/ui/Banner';
import { useToast } from '../components/ui/Toast';
import { PropertyChoice } from '../components/properties/PropertyChoice';
import { me } from '../design-system/mint-editorial';
import { styles } from './QuoteBuilderStyles';

type Status = 'all' | ContractorQuote['status'];
const statuses: Status[] = [
  'all',
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired',
];
export const QuoteBuilderScreen = ({
  navigation,
}: {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'QuoteBuilder'>;
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const accountId = user?.id;
  const [quotes, setQuotes] = useState<ContractorQuote[]>([]);
  const [stats, setStats] = useState<QuoteSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status>('all');
  const [search, setSearch] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mutationLock = useRef(false);
  const requestVersion = useRef(0);
  const activeAccount = useRef(accountId);
  activeAccount.current = accountId;
  const toast = useToast();

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!accountId) {
      setQuotes([]);
      setStats(null);
      setLoading(false);
      return;
    }
    const [list, summary] = await Promise.allSettled([
      QuoteBuilderService.getQuotes(accountId, { status: undefined }),
      QuoteBuilderService.getQuoteSummaryStats(accountId),
    ]);
    if (
      version !== requestVersion.current ||
      activeAccount.current !== accountId
    )
      return;
    if (list.status === 'fulfilled') {
      setQuotes(list.value);
      setListError(null);
    } else
      setListError(
        'Quotes could not be refreshed. Check your connection and retry.'
      );
    setStats(summary.status === 'fulfilled' ? summary.value : null);
    setLoading(false);
    setRefreshing(false);
  }, [accountId]);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setQuotes([]);
      setStats(null);
      setListError(null);
      void load();
      return () => {
        requestVersion.current++;
      };
    }, [load])
  );

  const mutate = async (id: string, action: 'duplicate' | 'delete') => {
    if (!accountId || mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true);
    try {
      if (action === 'duplicate') await QuoteBuilderService.duplicateQuote(id);
      else await QuoteBuilderService.deleteQuote(id);
      if (activeAccount.current !== accountId) return;
      await load();
      toast.success(
        action === 'duplicate' ? 'Draft copy created' : 'Draft deleted'
      );
    } catch {
      if (activeAccount.current === accountId)
        toast.error(
          action === 'duplicate'
            ? 'Could not duplicate this quote. Please retry.'
            : 'Could not delete this draft. Please retry.'
        );
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };
  const deleteDraft = (quote: ContractorQuote) => {
    if (quote.status !== 'draft' || busy) return;
    Alert.alert(
      'Delete draft?',
      `Delete “${quote.project_title}”? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete draft',
          style: 'destructive',
          onPress: () => void mutate(quote.id, 'delete'),
        },
      ]
    );
  };
  const query = search.trim().toLocaleLowerCase();
  const visible = quotes.filter(
    (quote) =>
      (selectedStatus === 'all' || quote.status === selectedStatus) &&
      (!query ||
        [
          quote.project_title,
          quote.client_name,
          quote.quote_number,
          quote.id,
        ].some((value) => value?.toLocaleLowerCase().includes(query)))
  );
  const statusOptions = statuses.map((value) => ({
    value,
    label: `${value === 'all' ? 'All statuses' : value.charAt(0).toUpperCase() + value.slice(1)} (${value === 'all' ? quotes.length : quotes.filter((quote) => quote.status === value).length})`,
  }));
  const open = (quote: ContractorQuote) =>
    navigation.navigate('QuoteDetail', { quoteId: quote.id });
  const reset = () => {
    setSearch('');
    setSelectedStatus('all');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color={me.ink} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Quotes</Text>
          <Text style={styles.subtitle}>Create, track and follow up</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          accessibilityRole='button'
          accessibilityLabel='Create new quote'
          onPress={() => navigation.navigate('CreateQuote', {})}
        >
          <Ionicons name='add' size={20} color={me.onBrand} />
          <Text style={styles.addButtonText}>New quote</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={visible}
        keyExtractor={(quote) => quote.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode='on-drag'
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={me.brand2}
          />
        }
        renderItem={({ item }) => (
          <QuoteCard
            quote={item}
            busy={busy}
            onPress={() => open(item)}
            onEdit={() => open(item)}
            onDuplicate={() => void mutate(item.id, 'duplicate')}
            onDelete={() => deleteDraft(item)}
          />
        )}
        ListHeaderComponent={
          <>
            {stats && (
              <View style={styles.statsCard}>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.sent_quotes}</Text>
                    <Text style={styles.statLabel}>Sent quotes</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {formatCurrency(stats.accepted_value)}
                    </Text>
                    <Text style={styles.statLabel}>Accepted quote value</Text>
                  </View>
                </View>
                <TouchableOpacity
                  accessibilityRole='button'
                  accessibilityState={{ expanded: showStats }}
                  onPress={() => setShowStats((value) => !value)}
                  style={styles.summaryToggle}
                >
                  <Text style={styles.link}>
                    {showStats ? 'Hide summary' : 'Quote summary'}
                  </Text>
                  <Ionicons
                    name={showStats ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={me.brand2}
                  />
                </TouchableOpacity>
                {showStats && (
                  <View style={styles.summaryDetails}>
                    <Text style={styles.meta}>
                      {stats.total_quotes} total · {stats.accepted_quotes}{' '}
                      accepted
                    </Text>
                    <Text style={styles.meta}>
                      Total quoted: {formatCurrency(stats.total_value)}
                    </Text>
                    <Text style={styles.meta}>
                      Acceptance rate: {stats.acceptance_rate.toFixed(0)}% of
                      non-draft quotes
                    </Text>
                    <Text style={styles.meta}>
                      Quote values are not payments received.
                    </Text>
                  </View>
                )}
              </View>
            )}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.secondaryButton}
                accessibilityRole='button'
                onPress={() => navigation.navigate('QuickQuote', {})}
              >
                <Ionicons name='flash-outline' size={18} color={me.brand2} />
                <Text style={styles.link}>Quick quote</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                accessibilityRole='button'
                onPress={() => navigation.navigate('QuoteTemplates')}
              >
                <Ionicons
                  name='documents-outline'
                  size={18}
                  color={me.brand2}
                />
                <Text style={styles.link}>Templates</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name='search-outline' size={20} color={me.ink3} />
              <TextInput
                style={styles.search}
                accessibilityLabel='Search quotes'
                placeholder='Search title, client or reference'
                placeholderTextColor={me.ink3}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {!!search && (
                <TouchableOpacity
                  accessibilityRole='button'
                  accessibilityLabel='Clear quote search'
                  onPress={() => setSearch('')}
                  style={styles.clear}
                >
                  <Ionicons name='close-circle' size={20} color={me.ink2} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.filterRow}>
              <PropertyChoice
                label='Quote status'
                value={selectedStatus}
                options={statusOptions}
                onChange={(value) => setSelectedStatus(value as Status)}
              />
              <Text style={styles.meta}>
                {visible.length} {visible.length === 1 ? 'quote' : 'quotes'}
              </Text>
            </View>
            {listError && (
              <View style={styles.error}>
                <Banner message={listError} variant='error' />
                <TouchableOpacity
                  accessibilityRole='button'
                  onPress={() => {
                    setLoading(true);
                    void load();
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.link}>Retry quotes</Text>
                </TouchableOpacity>
              </View>
            )}
            {busy && (
              <Text accessibilityRole='alert' style={styles.meta}>
                Updating quote…
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              accessibilityLabel='Loading quotes'
              style={styles.emptyState}
              color={me.brand2}
            />
          ) : listError ? null : (
            <View style={styles.emptyState}>
              <Ionicons
                name='document-text-outline'
                size={32}
                color={me.ink3}
              />
              <Text style={styles.emptyTitle}>
                {search || selectedStatus !== 'all'
                  ? 'No matching quotes'
                  : 'No quotes yet'}
              </Text>
              <Text style={styles.emptyText}>
                {search || selectedStatus !== 'all'
                  ? 'Try another search or status.'
                  : 'Create a quote or start with a template.'}
              </Text>
              {(!!search || selectedStatus !== 'all') && (
                <TouchableOpacity
                  accessibilityRole='button'
                  style={styles.secondaryButton}
                  onPress={reset}
                >
                  <Text style={styles.link}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </View>
  );
};
