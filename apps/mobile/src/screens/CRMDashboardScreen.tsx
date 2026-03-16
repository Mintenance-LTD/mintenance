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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { ProfileStackParamList, RootTabParamList } from '../navigation/types';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import {
  ContractorBusinessSuite,
  type ClientAnalytics,
} from '../services/contractor-business';
import { ClientCard, ClientData } from '../components/ClientCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import SearchBar from '../components/SearchBar';
import { theme } from '../theme';

interface CRMDashboardScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'CRMDashboard'>;
}

const ANALYTICS_ITEMS = [
  { key: 'total_clients', label: 'Total Clients', icon: 'people-outline' as const, iconColor: '#3B82F6', iconBg: '#DBEAFE' },
  { key: 'new_clients_this_month', label: 'New This Month', icon: 'person-add-outline' as const, iconColor: theme.colors.primary, iconBg: theme.colors.primaryLight },
  { key: 'repeat_clients', label: 'Repeat Clients', icon: 'refresh-outline' as const, iconColor: '#8B5CF6', iconBg: '#EDE9FE' },
  { key: 'client_lifetime_value', label: 'Avg. LTV', icon: 'cash-outline' as const, iconColor: theme.colors.accent, iconBg: theme.colors.accentLight, prefix: '£', round: true },
];

export const CRMDashboardScreen: React.FC<CRMDashboardScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const tabNavigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
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
      const [analyticsData, clientsData] = await Promise.all([
        ContractorBusinessSuite.clients.getClientAnalytics(user.id),
        ContractorBusinessSuite.clients.getClients(user.id),
      ]);
      setClients((clientsData?.clients as unknown as ClientData[]) || []);
      setAnalytics(analyticsData as unknown as ClientAnalytics);
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
    tabNavigation.navigate('MessagingTab', {
      screen: 'Messaging',
      params: {
        conversationId: client.client_id,
        recipientId: client.client_id,
        recipientName: `${client.first_name} ${client.last_name}`.trim(),
      },
    } as never);
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

  if (loading) {
    return <LoadingSpinner message='Loading CRM dashboard...' />;
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
          <Ionicons name='arrow-back' size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddClient')}
          accessibilityRole="button"
          accessibilityLabel="Add client"
        >
          <View style={styles.addIconWrap}>
            <Ionicons name='person-add' size={18} color={theme.colors.textInverse} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.textPrimary} colors={[theme.colors.textPrimary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Analytics Cards */}
        <View style={styles.analyticsContainer}>
          {ANALYTICS_ITEMS.map((item) => {
            const raw = analytics ? (analytics as unknown as Record<string, unknown>)[item.key] : 0;
            const numValue = Number(raw ?? 0) || 0;
            const displayValue = item.round ? Math.round(numValue) : numValue;
            return (
              <View key={item.key} style={styles.analyticsCard}>
                <View style={[styles.analyticsIconWrap, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={16} color={item.iconColor} />
                </View>
                <Text style={styles.analyticsValue}>
                  {item.prefix || ''}{String(displayValue)}
                </Text>
                <Text style={styles.analyticsLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>

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
          contentContainerStyle={styles.filtersContent}
        >
          {([
            ['all', 'All'],
            ['active', 'Active'],
            ['prospect', 'Prospects'],
            ['inactive', 'Inactive'],
            ['high-risk', 'High Risk'],
          ] as const).map(([filter, label]) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedFilter === filter }}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter && styles.filterTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by</Text>
          <View style={styles.sortButtons}>
            {([
              ['name', 'Name', 'text-outline'],
              ['revenue', 'Revenue', 'cash-outline'],
              ['jobs', 'Jobs', 'briefcase-outline'],
              ['recent', 'Recent', 'time-outline'],
            ] as const).map(([sort, label, icon]) => (
              <TouchableOpacity
                key={sort}
                style={[styles.sortButton, sortBy === sort && styles.sortButtonActive]}
                onPress={() => setSortBy(sort)}
                accessibilityRole="button"
                accessibilityState={{ selected: sortBy === sort }}
              >
                <Ionicons
                  name={icon as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={sortBy === sort ? theme.colors.textInverse : theme.colors.textSecondary}
                />
                <Text style={[styles.sortText, sortBy === sort && styles.sortTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Client List */}
        <View style={styles.clientList}>
          {filteredAndSortedClients.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name='people-outline' size={32} color={theme.colors.textTertiary} />
              </View>
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
                  (navigation.navigate as (...args: unknown[]) => void)('ClientDetail', { client })
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
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  addButton: {
    padding: 4,
  },
  addIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
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
  analyticsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
    paddingBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
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
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.textInverse,
  },
  sortContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    gap: 4,
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
  sortButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  sortText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  sortTextActive: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  clientList: {
    paddingHorizontal: 16,
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
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  addClientButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  addClientButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CRMDashboardScreen;
