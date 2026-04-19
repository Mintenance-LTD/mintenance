import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { logger } from '../utils/logger';
import { formatCurrency } from '../utils/formatCurrency';
import { useAuth } from '../contexts/AuthContext';
import {
  QuoteBuilderService,
  ContractorQuote,
  QuoteSummaryStats,
} from '../services/QuoteBuilderService';
import { QuoteCard } from '../components/QuoteCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Banner } from '../components/ui/Banner';
import { useToast } from '../components/ui/Toast';
import { theme } from '../theme';
import { styles } from './QuoteBuilderStyles';

interface QuoteBuilderScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'QuoteBuilder'>;
}

export const QuoteBuilderScreen: React.FC<QuoteBuilderScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<ContractorQuote[]>([]);
  const [stats, setStats] = useState<QuoteSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadQuotes();
    loadStats();
  }, []);

  const loadQuotes = async () => {
    if (!user) return;

    try {
      const statusFilter =
        selectedStatus === 'all'
          ? undefined
          : [selectedStatus as ContractorQuote['status']];
      const data = await QuoteBuilderService.getQuotes(user?.id || '', {
        status: statusFilter,
      });
      setQuotes(data);
    } catch (error) {
      logger.error('Error loading quotes', error);
      setListError('Failed to load quotes. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const statsData = await QuoteBuilderService.getQuoteSummaryStats(user.id);
      setStats(statsData);
    } catch (error) {
      logger.error('Error loading stats', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadQuotes(), loadStats()]);
    setRefreshing(false);
  };

  const handleStatusFilter = async (status: string) => {
    setSelectedStatus(status);
    setLoading(true);

    try {
      const statusFilter =
        status === 'all' ? undefined : [status as ContractorQuote['status']];
      const data = await QuoteBuilderService.getQuotes(user?.id || '', {
        status: statusFilter,
      });
      setQuotes(data);
    } catch (error) {
      toast.error('Failed to filter quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async (quoteId: string) => {
    try {
      await QuoteBuilderService.sendQuote(quoteId);
      await loadQuotes();
      toast.success('Quote sent successfully');
    } catch (error) {
      toast.error('Failed to send quote');
    }
  };

  const handleDuplicateQuote = async (quoteId: string) => {
    try {
      await QuoteBuilderService.duplicateQuote(quoteId);
      await loadQuotes();
      toast.success('Quote duplicated successfully');
    } catch (error) {
      toast.error('Failed to duplicate quote');
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    Alert.alert(
      'Delete Quote',
      'Are you sure you want to delete this quote? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await QuoteBuilderService.deleteQuote(quoteId);
              await loadQuotes();
              toast.success('Quote deleted successfully');
            } catch (error) {
              toast.error('Failed to delete quote');
            }
          },
        },
      ]
    );
  };

  const STAT_ITEMS = stats
    ? [
        {
          value: String(stats.total_quotes),
          label: 'Total',
          iconColor: '#3B82F6',
          iconBg: '#DBEAFE',
          icon: 'document-text-outline' as const,
        },
        {
          value: String(stats.accepted_quotes),
          label: 'Accepted',
          iconColor: theme.colors.primary,
          iconBg: theme.colors.primaryLight,
          icon: 'checkmark-circle-outline' as const,
        },
        {
          value: formatCurrency(stats.total_value),
          label: 'Value',
          iconColor: theme.colors.accent,
          iconBg: theme.colors.accentLight,
          icon: 'wallet-outline' as const,
        },
        {
          value: `${stats.acceptance_rate.toFixed(0)}%`,
          label: 'Success',
          iconColor: '#8B5CF6',
          iconBg: '#EDE9FE',
          icon: 'trending-up-outline' as const,
        },
      ]
    : [];

  const QUICK_ACTIONS = [
    {
      icon: 'document-text' as const,
      label: 'Templates',
      iconColor: '#3B82F6',
      iconBg: '#DBEAFE',
      onPress: () =>
        (navigation.navigate as (...args: unknown[]) => void)('QuoteTemplates'),
    },
    {
      icon: 'analytics' as const,
      label: 'Analytics',
      iconColor: '#8B5CF6',
      iconBg: '#EDE9FE',
      onPress: () => setShowAnalytics((prev) => !prev),
    },
    {
      icon: 'add-circle' as const,
      label: 'New Quote',
      iconColor: theme.colors.primary,
      iconBg: theme.colors.primaryLight,
      onPress: () =>
        (navigation.navigate as (...args: unknown[]) => void)('CreateQuote'),
    },
  ];

  if (loading && quotes.length === 0) {
    return <LoadingSpinner message='Loading quotes...' />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole='button'
            accessibilityLabel='Go back'
          >
            <Ionicons
              name='arrow-back'
              size={24}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerLabel}>Revenue Growth</Text>
            <Text style={styles.headerTitle}>Quote Builder</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            (navigation.navigate as (...args: unknown[]) => void)('CreateQuote')
          }
          accessibilityRole='button'
          accessibilityLabel='Create new quote'
        >
          <Ionicons
            name='add-circle'
            size={18}
            color={theme.colors.textInverse}
          />
          <Text style={styles.addButtonText}>New Quote</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.textPrimary}
            colors={[theme.colors.textPrimary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {listError && (
          <View style={{ paddingTop: 8 }}>
            <Banner message={listError} variant='error' />
          </View>
        )}

        {/* Statistics */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Performance</Text>
            <View style={styles.statsGrid}>
              {STAT_ITEMS.map((item) => (
                <View key={item.label} style={styles.statItem}>
                  <View
                    style={[
                      styles.statIconWrap,
                      { backgroundColor: item.iconBg },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={item.iconColor}
                    />
                  </View>
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Status Filter - Dark active */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {[
            { key: 'all', label: 'All', count: stats?.total_quotes || 0 },
            { key: 'draft', label: 'Draft', count: stats?.draft_quotes || 0 },
            { key: 'sent', label: 'Sent', count: stats?.sent_quotes || 0 },
            {
              key: 'accepted',
              label: 'Accepted',
              count: stats?.accepted_quotes || 0,
            },
            {
              key: 'rejected',
              label: 'Rejected',
              count: stats?.rejected_quotes || 0,
            },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                selectedStatus === filter.key && styles.filterChipActive,
              ]}
              onPress={() => handleStatusFilter(filter.key)}
              accessibilityRole='button'
              accessibilityLabel={`Filter by ${filter.label}, ${filter.count} quotes`}
              accessibilityState={{ selected: selectedStatus === filter.key }}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === filter.key && styles.filterTextActive,
                ]}
              >
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionButton}
              onPress={action.onPress}
              accessibilityRole='button'
              accessibilityLabel={action.label}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIconWrap,
                  { backgroundColor: action.iconBg },
                ]}
              >
                <Ionicons
                  name={action.icon}
                  size={20}
                  color={action.iconColor}
                />
              </View>
              <Text style={styles.actionButtonText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Inline Analytics Panel */}
        {showAnalytics && stats && (
          <View style={styles.analyticsPanel}>
            <Text style={styles.analyticsTitle}>Analytics Overview</Text>
            <View style={styles.analyticsRow}>
              <View style={styles.analyticsStat}>
                <Text style={styles.analyticsValue}>{stats.total_quotes}</Text>
                <Text style={styles.analyticsLabel}>Total Quotes</Text>
              </View>
              <View style={styles.analyticsStat}>
                <Text style={styles.analyticsValue}>
                  {stats.acceptance_rate
                    ? `${Math.round(stats.acceptance_rate)}%`
                    : '—'}
                </Text>
                <Text style={styles.analyticsLabel}>Acceptance Rate</Text>
              </View>
              <View style={styles.analyticsStat}>
                <Text style={styles.analyticsValue}>
                  {stats.total_value
                    ? formatCurrency(stats.total_value)
                    : formatCurrency(0)}
                </Text>
                <Text style={styles.analyticsLabel}>Total Value</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quotes List */}
        <View style={styles.quotesContainer}>
          <Text style={styles.sectionTitle}>
            {selectedStatus === 'all'
              ? 'All Quotes'
              : `${selectedStatus.charAt(0).toUpperCase()}${selectedStatus.slice(1)} Quotes`}
          </Text>

          {quotes.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name='document-text-outline'
                  size={32}
                  color={theme.colors.textTertiary}
                />
              </View>
              <Text style={styles.emptyTitle}>No quotes found</Text>
              <Text style={styles.emptyText}>
                {selectedStatus === 'all'
                  ? 'Create your first quote to get started with professional proposals'
                  : `No ${selectedStatus} quotes at the moment`}
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() =>
                  (navigation.navigate as (...args: unknown[]) => void)(
                    'CreateQuote'
                  )
                }
                accessibilityRole='button'
                accessibilityLabel='Create your first quote'
              >
                <Text style={styles.createButtonText}>Create Quote</Text>
              </TouchableOpacity>
            </View>
          ) : (
            quotes.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onPress={() =>
                  (navigation.navigate as (...args: unknown[]) => void)(
                    'QuoteDetail',
                    { quoteId: quote.id }
                  )
                }
                onEdit={() =>
                  (navigation.navigate as (...args: unknown[]) => void)(
                    'CreateQuote',
                    { jobId: quote.job_id }
                  )
                }
                onSend={() => handleSendQuote(quote.id)}
                onDuplicate={() => handleDuplicateQuote(quote.id)}
                onDelete={() => handleDeleteQuote(quote.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};
