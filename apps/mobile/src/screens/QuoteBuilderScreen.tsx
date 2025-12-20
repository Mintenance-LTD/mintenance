import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../theme';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import {
  QuoteBuilderService,
  ContractorQuote,
  QuoteSummaryStats,
} from '../services/QuoteBuilderService';
import { QuoteCard } from '../components/QuoteCard';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface QuoteBuilderScreenProps {
  navigation: StackNavigationProp<any>;
}

export const QuoteBuilderScreen: React.FC<QuoteBuilderScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<ContractorQuote[]>([]);
  const [stats, setStats] = useState<QuoteSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    loadQuotes();
    loadStats();
  }, []);

  const loadQuotes = async () => {
    if (!user) return;

    try {
      const statusFilter =
        selectedStatus === 'all' ? undefined : [selectedStatus as any];
      const data = await QuoteBuilderService.getQuotes(user?.id || '', {
        status: statusFilter,
      });
      setQuotes(data);
    } catch (error) {
      logger.error('Error loading quotes', error);
      Alert.alert('Error', 'Failed to load quotes');
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
      const statusFilter = status === 'all' ? undefined : [status as any];
      const data = await QuoteBuilderService.getQuotes(user?.id || '', {
        status: statusFilter,
      });
      setQuotes(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to filter quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async (quoteId: string) => {
    try {
      await QuoteBuilderService.sendQuote(quoteId);
      await loadQuotes();
      Alert.alert('Success', 'Quote sent successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to send quote');
    }
  };

  const handleDuplicateQuote = async (quoteId: string) => {
    try {
      await QuoteBuilderService.duplicateQuote(quoteId);
      await loadQuotes();
      Alert.alert('Success', 'Quote duplicated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to duplicate quote');
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
              Alert.alert('Success', 'Quote deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete quote');
            }
          },
        },
      ]
    );
  };

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Quote Performance</Text>

        <View style={styles.statsRow}>
          <View
            style={[styles.statCard, { borderLeftColor: theme.colors.primary }]}
          >
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {stats.total_quotes}
            </Text>
            <Text style={styles.statLabel}>Total Quotes</Text>
          </View>

          <View
            style={[styles.statCard, { borderLeftColor: theme.colors.success }]}
          >
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {stats.accepted_quotes}
            </Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View
            style={[styles.statCard, { borderLeftColor: theme.colors.warning }]}
          >
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>
              £{stats.total_value.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { borderLeftColor: theme.colors.secondary },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
              {stats.acceptance_rate.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStatusFilter = () => (
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
  );

  if (loading && quotes.length === 0) {
    return <LoadingSpinner message='Loading quotes...' />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color={theme.colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quote Builder</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateQuote')}
        >
          <Ionicons name='add' size={24} color={theme.colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics */}
        {renderStatsCard()}

        {/* Status Filter */}
        {renderStatusFilter()}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('QuoteTemplates')}
          >
            <Ionicons
              name='document-text'
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.actionButtonText}>Templates</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('QuoteAnalytics')}
          >
            <Ionicons name='analytics' size={24} color={theme.colors.primary} />
            <Text style={styles.actionButtonText}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateQuote')}
          >
            <Ionicons
              name='add-circle'
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.actionButtonText}>New Quote</Text>
          </TouchableOpacity>
        </View>

        {/* Quotes List */}
        <View style={styles.quotesContainer}>
          <Text style={styles.sectionTitle}>
            {selectedStatus === 'all'
              ? 'All Quotes'
              : `${selectedStatus.charAt(0).toUpperCase()}${selectedStatus.slice(1)} Quotes`}
          </Text>

          {quotes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name='document-text-outline'
                size={64}
                color={theme.colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>No quotes found</Text>
              <Text style={styles.emptyText}>
                {selectedStatus === 'all'
                  ? 'Create your first quote to get started with professional proposals'
                  : `No ${selectedStatus} quotes at the moment`}
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateQuote')}
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
                  navigation.navigate('QuoteDetail', { quoteId: quote.id })
                }
                onEdit={() =>
                  navigation.navigate('EditQuote', { quoteId: quote.id })
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
    backgroundColor: theme.colors.surfaceSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.white,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    ...theme.shadows.base,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.base,
    padding: 12,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    paddingRight: 16,
  },
  filterChip: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: theme.colors.white,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    ...theme.shadows.base,
  },
  actionButtonText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    marginTop: 6,
    fontWeight: '500',
  },
  quotesContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
  },
  createButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QuoteBuilderScreen;
