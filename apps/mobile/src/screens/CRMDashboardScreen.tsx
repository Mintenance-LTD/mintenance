import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../theme';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import {
  contractorBusinessSuite,
  type ClientAnalytics,
} from '../services/contractor-business';
import { ClientCard, ClientData } from '../components/ClientCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import SearchBar from '../components/SearchBar';

interface CRMDashboardScreenProps {
  navigation: StackNavigationProp<any>;
}

export const CRMDashboardScreen: React.FC<CRMDashboardScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'active' | 'prospect' | 'inactive' | 'high-risk'
  >('all');
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'jobs' | 'recent'>(
    'name'
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;

    try {
      const analyticsData = await contractorBusinessSuite.getClientAnalytics(
        user.id
      );
      setClients([]);
      setAnalytics(analyticsData);
    } catch (error) {
      logger.error('Error loading CRM data', error);
      Alert.alert('Error', 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredAndSortedClients = clients
    .filter((client) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = `${client.first_name} ${client.last_name}`.toLowerCase();
        if (
          !name.includes(query) &&
          !client.email.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Status filter
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'high-risk') return client.churn_risk_score >= 70;
      return client.relationship_status === selectedFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.first_name} ${a.last_name}`.localeCompare(
            `${b.first_name} ${b.last_name}`
          );
        case 'revenue':
          return b.total_revenue - a.total_revenue;
        case 'jobs':
          return b.total_jobs - a.total_jobs;
        case 'recent':
          const aDate = new Date(a.last_job_date || a.created_at);
          const bDate = new Date(b.last_job_date || b.created_at);
          return bDate.getTime() - aDate.getTime();
        default:
          return 0;
      }
    });

  const handleCall = async (client: ClientData) => {
    if (client.phone) {
      const url = `tel:${client.phone}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot make phone call');
      }
    }
  };

  const handleMessage = (client: ClientData) => {
    navigation.navigate('ClientChat', { clientId: client.client_id });
  };

  const handleEmail = async (client: ClientData) => {
    const url = `mailto:${client.email}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open email client');
    }
  };

  const renderFilterButton = (
    filter: typeof selectedFilter,
    label: string,
    color: string
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && { backgroundColor: color },
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text
        style={[
          styles.filterText,
          selectedFilter === filter && { color: theme.colors.white },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSortButton = (
    sort: typeof sortBy,
    label: string,
    icon: string
  ) => (
    <TouchableOpacity
      style={[styles.sortButton, sortBy === sort && styles.sortButtonActive]}
      onPress={() => setSortBy(sort)}
    >
      <Ionicons
        name={icon as any}
        size={16}
        color={
          sortBy === sort ? theme.colors.primary : theme.colors.textSecondary
        }
      />
      <Text style={[styles.sortText, sortBy === sort && styles.sortTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingSpinner message='Loading CRM dashboard...' />;
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
        <Text style={styles.headerTitle}>Client Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddClient')}
        >
          <Ionicons name='person-add' size={24} color={theme.colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Analytics Cards */}
        {analytics && (
          <View style={styles.analyticsContainer}>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>
                {analytics.total_clients}
              </Text>
              <Text style={styles.analyticsLabel}>Total Clients</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text
                style={[styles.analyticsValue, { color: theme.colors.success }]}
              >
                {analytics.new_clients_this_month}
              </Text>
              <Text style={styles.analyticsLabel}>New This Month</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text
                style={[styles.analyticsValue, { color: theme.colors.warning }]}
              >
                {analytics.repeat_clients}
              </Text>
              <Text style={styles.analyticsLabel}>Repeat Clients</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>
                £{Math.round(analytics.client_lifetime_value)}
              </Text>
              <Text style={styles.analyticsLabel}>Avg. LTV</Text>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            placeholder='Search clients...'
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
        >
          {renderFilterButton('all', 'All', theme.colors.primary)}
          {renderFilterButton('active', 'Active', theme.colors.success)}
          {renderFilterButton('prospect', 'Prospects', theme.colors.warning)}
          {renderFilterButton(
            'inactive',
            'Inactive',
            theme.colors.textSecondary
          )}
          {renderFilterButton('high-risk', 'High Risk', theme.colors.error)}
        </ScrollView>

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <View style={styles.sortButtons}>
            {renderSortButton('name', 'Name', 'text-outline')}
            {renderSortButton('revenue', 'Revenue', 'cash-outline')}
            {renderSortButton('jobs', 'Jobs', 'briefcase-outline')}
            {renderSortButton('recent', 'Recent', 'time-outline')}
          </View>
        </View>

        {/* Client List */}
        <View style={styles.clientList}>
          {filteredAndSortedClients.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name='people-outline'
                size={64}
                color={theme.colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>No clients found</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? `No clients match "${searchQuery}"`
                  : 'Add your first client to get started'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.addClientButton}
                  onPress={() => navigation.navigate('AddClient')}
                >
                  <Text style={styles.addClientButtonText}>Add Client</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredAndSortedClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onPress={() =>
                  navigation.navigate('ClientDetail', {
                    clientId: client.client_id,
                  })
                }
                onCall={() => handleCall(client)}
                onMessage={() => handleMessage(client)}
                onEmail={() => handleEmail(client)}
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
  analyticsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    alignItems: 'center',
    ...theme.shadows.base,
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  analyticsLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
    backgroundColor: theme.colors.background,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  sortContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sortButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  sortText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  sortTextActive: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  clientList: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  },
  addClientButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
  },
  addClientButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CRMDashboardScreen;
