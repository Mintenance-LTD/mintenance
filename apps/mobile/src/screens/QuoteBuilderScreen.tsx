import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { logger } from '../utils/logger';
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
        selectedStatus === 'all' ? undefined : [selectedStatus as ContractorQuote['status']];
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
      const statusFilter = status === 'all' ? undefined : [status as ContractorQuote['status']];
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

  const STAT_ITEMS = stats ? [
    { value: String(stats.total_quotes), label: 'Total', iconColor: '#3B82F6', iconBg: '#DBEAFE', icon: 'document-text-outline' as const },
    { value: String(stats.accepted_quotes), label: 'Accepted', iconColor: '#10B981', iconBg: '#D1FAE5', icon: 'checkmark-circle-outline' as const },
    { value: `£${stats.total_value.toFixed(0)}`, label: 'Value', iconColor: '#F59E0B', iconBg: '#FEF3C7', icon: 'wallet-outline' as const },
    { value: `${stats.acceptance_rate.toFixed(0)}%`, label: 'Success', iconColor: '#8B5CF6', iconBg: '#EDE9FE', icon: 'trending-up-outline' as const },
  ] : [];

  const QUICK_ACTIONS = [
    { icon: 'document-text' as const, label: 'Templates', iconColor: '#3B82F6', iconBg: '#DBEAFE', onPress: () => (navigation.navigate as (...args: unknown[]) => void)('QuoteTemplates') },
    { icon: 'analytics' as const, label: 'Analytics', iconColor: '#8B5CF6', iconBg: '#EDE9FE', onPress: () => setShowAnalytics(prev => !prev) },
    { icon: 'add-circle' as const, label: 'New Quote', iconColor: '#10B981', iconBg: '#D1FAE5', onPress: () => (navigation.navigate as (...args: unknown[]) => void)('CreateQuote') },
  ];

  if (loading && quotes.length === 0) {
    return <LoadingSpinner message='Loading quotes...' />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name='arrow-back' size={24} color='#222222' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quote Builder</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => (navigation.navigate as (...args: unknown[]) => void)('CreateQuote')}
          accessibilityRole="button"
          accessibilityLabel="Create new quote"
        >
          <View style={styles.addIconWrap}>
            <Ionicons name='add' size={20} color='#FFFFFF' />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#222222" colors={['#222222']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {listError && (
          <View style={{ paddingTop: 8 }}>
            <Banner message={listError} variant="error" />
          </View>
        )}

        {/* Statistics */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Performance</Text>
            <View style={styles.statsGrid}>
              {STAT_ITEMS.map((item) => (
                <View key={item.label} style={styles.statItem}>
                  <View style={[styles.statIconWrap, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.icon} size={16} color={item.iconColor} />
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
            { key: 'accepted', label: 'Accepted', count: stats?.accepted_quotes || 0 },
            { key: 'rejected', label: 'Rejected', count: stats?.rejected_quotes || 0 },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                selectedStatus === filter.key && styles.filterChipActive,
              ]}
              onPress={() => handleStatusFilter(filter.key)}
              accessibilityRole="button"
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
              accessibilityRole="button"
              accessibilityLabel={action.label}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: action.iconBg }]}>
                <Ionicons name={action.icon} size={20} color={action.iconColor} />
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
                  {stats.acceptance_rate ? `${Math.round(stats.acceptance_rate)}%` : '—'}
                </Text>
                <Text style={styles.analyticsLabel}>Acceptance Rate</Text>
              </View>
              <View style={styles.analyticsStat}>
                <Text style={styles.analyticsValue}>
                  £{stats.total_value ? Math.round(stats.total_value / 1000) + 'k' : '0'}
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
                <Ionicons name='document-text-outline' size={32} color='#B0B0B0' />
              </View>
              <Text style={styles.emptyTitle}>No quotes found</Text>
              <Text style={styles.emptyText}>
                {selectedStatus === 'all'
                  ? 'Create your first quote to get started with professional proposals'
                  : `No ${selectedStatus} quotes at the moment`}
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => (navigation.navigate as (...args: unknown[]) => void)('CreateQuote')}
                accessibilityRole="button"
                accessibilityLabel="Create your first quote"
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
                  (navigation.navigate as (...args: unknown[]) => void)('QuoteDetail', { quoteId: quote.id })
                }
                onEdit={() =>
                  (navigation.navigate as (...args: unknown[]) => void)('CreateQuote', { jobId: quote.job_id })
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  addButton: {
    padding: 4,
  },
  addIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#717171',
    textAlign: 'center',
  },
  filterContainer: {
    marginBottom: 14,
  },
  filterContent: {
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  filterChipActive: {
    backgroundColor: '#222222',
  },
  filterText: {
    fontSize: 13,
    color: '#717171',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#222222',
    fontWeight: '600',
  },
  quotesContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#717171',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: '#222222',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 28,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  analyticsPanel: {
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  analyticsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 12,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  analyticsStat: {
    flex: 1,
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },
  analyticsLabel: {
    fontSize: 11,
    color: '#717171',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default QuoteBuilderScreen;
