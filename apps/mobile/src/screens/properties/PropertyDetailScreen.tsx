/**
 * PropertyDetailScreen - View and manage a single property with tabbed interface
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  ScreenHeader,
  LoadingSpinner,
  ErrorView,
} from '../../components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { Property } from '@mintenance/types';
import type { ProfileStackParamList } from '../../navigation/types';
import { Badge } from '../../components/ui/Badge/Badge';
import { theme } from '../../theme';
import { PropertyHealthScore } from './components/PropertyHealthScore';
import { SpendingAnalytics } from './components/SpendingAnalytics';
import { RecurringMaintenance } from './components/RecurringMaintenance';
import { TenantContacts } from './components/TenantContacts';
import { TeamAccess } from './components/TeamAccess';
import { ComplianceCertificates } from './components/ComplianceCertificates';

interface Props {
  navigation: NativeStackNavigationProp<
    ProfileStackParamList,
    'PropertyDetail'
  >;
  route: RouteProp<ProfileStackParamList, 'PropertyDetail'>;
}

type Tab = 'overview' | 'maintenance' | 'manage';

const TABS: {
  key: Tab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'overview', label: 'Overview', icon: 'home-outline' },
  { key: 'maintenance', label: 'Maintenance', icon: 'construct-outline' },
  { key: 'manage', label: 'Manage', icon: 'settings-outline' },
];

const InfoRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <Ionicons name={icon} size={16} color={theme.colors.textSecondary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

export const PropertyDetailScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { propertyId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isFavorite, setIsFavorite] = useState(false);

  const {
    data: property,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const data = await mobileApiClient.get<Property>(
        `/api/properties/${propertyId}`
      );
      return data;
    },
    enabled: !!user && !!propertyId,
  });

  const { data: jobsData } = useQuery({
    queryKey: ['property-jobs', propertyId],
    queryFn: async () => {
      try {
        const rows = await mobileApiClient.get<
          Array<{
            id: string;
            title: string;
            status: string;
            budget: number;
            created_at: string;
            category?: string;
          }>
        >(`/api/properties/${propertyId}/jobs`);
        return rows || [];
      } catch {
        return [];
      }
    },
    enabled: !!user && !!propertyId,
  });

  const propertyJobs = jobsData || [];
  const completedJobs = propertyJobs.filter((j) => j.status === 'completed');
  const activeJobs = propertyJobs.filter(
    (j) => j.status === 'in_progress' || j.status === 'assigned'
  );
  const totalSpent = completedJobs.reduce((sum, j) => sum + (j.budget || 0), 0);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await mobileApiClient.delete(`/api/properties/${propertyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigation.goBack();
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        await mobileApiClient.delete(
          `/api/properties/favorites?property_id=${propertyId}`
        );
      } else {
        await mobileApiClient.post('/api/properties/favorites', {
          property_id: propertyId,
        });
      }
    },
    onSuccess: () => {
      setIsFavorite(!isFavorite);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Property',
      'Are you sure you want to remove this property? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) return <LoadingSpinner message='Loading property...' />;
  if (error)
    return <ErrorView message='Failed to load property' onRetry={refetch} />;
  if (!property)
    return <ErrorView message='Property not found' onRetry={refetch} />;

  const formatType = (type: string) =>
    type.charAt(0).toUpperCase() + type.slice(1);

  const renderOverviewTab = () => (
    <>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedJobs.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#3B82F6' }]}>
            {activeJobs.length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
            {'\u00A3'}
            {totalSpent >= 1000
              ? `${(totalSpent / 1000).toFixed(1)}k`
              : totalSpent}
          </Text>
          <Text style={styles.statLabel}>Spent</Text>
        </View>
      </View>

      {/* Health Score */}
      <PropertyHealthScore jobs={propertyJobs} />

      {/* Spending Analytics */}
      <SpendingAnalytics jobs={propertyJobs} />

      {/* Property Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PROPERTY INFORMATION</Text>
        <InfoRow
          icon='business-outline'
          label='Type'
          value={formatType(property.property_type ?? '')}
        />
        {property.bedrooms != null && (
          <InfoRow
            icon='bed-outline'
            label='Bedrooms'
            value={String(property.bedrooms)}
          />
        )}
        {property.bathrooms != null && (
          <InfoRow
            icon='water-outline'
            label='Bathrooms'
            value={String(property.bathrooms)}
          />
        )}
        {property.year_built != null && (
          <InfoRow
            icon='calendar-outline'
            label='Year Built'
            value={String(property.year_built)}
          />
        )}
        {property.square_footage != null && (
          <InfoRow
            icon='resize-outline'
            label='Size'
            value={`${property.square_footage} sq ft`}
          />
        )}
      </View>

      {property.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTES</Text>
          <Text style={styles.notesText}>{property.notes}</Text>
        </View>
      )}

      {/* Job History */}
      <View style={styles.section}>
        <View style={styles.jobHistoryHeader}>
          <Text style={styles.sectionTitle}>JOB HISTORY</Text>
          {totalSpent > 0 && (
            <View style={styles.totalSpentBadge}>
              <Text style={styles.totalSpentText}>
                {'\u00A3'}
                {totalSpent.toLocaleString('en-GB')} spent
              </Text>
            </View>
          )}
        </View>
        {propertyJobs.length === 0 ? (
          <View style={styles.emptyJobsWrap}>
            <View style={styles.emptyJobsIcon}>
              <Ionicons
                name='briefcase-outline'
                size={20}
                color={theme.colors.textTertiary}
              />
            </View>
            <Text style={styles.emptyJobsText}>
              No jobs for this property yet.
            </Text>
          </View>
        ) : (
          propertyJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobRow}
              onPress={() =>
                (navigation as ReturnType<typeof Object>).navigate('JobsTab', {
                  screen: 'JobDetails',
                  params: { jobId: job.id },
                })
              }
              accessibilityRole='button'
              accessibilityLabel={`View ${job.title}`}
            >
              <View style={styles.jobRowInfo}>
                <Text style={styles.jobRowTitle} numberOfLines={1}>
                  {job.title}
                </Text>
                <Text style={styles.jobRowDate}>
                  {new Date(job.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.jobRowRight}>
                {job.budget ? (
                  <Text style={styles.jobRowBudget}>
                    {'\u00A3'}
                    {job.budget.toLocaleString()}
                  </Text>
                ) : null}
                <Badge
                  variant={
                    job.status === 'completed'
                      ? 'success'
                      : job.status === 'in_progress'
                        ? 'primary'
                        : 'warning'
                  }
                  size='sm'
                >
                  {job.status === 'in_progress'
                    ? 'In Progress'
                    : (job.status ?? '').charAt(0).toUpperCase() +
                      (job.status ?? '').slice(1)}
                </Badge>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </>
  );

  const renderMaintenanceTab = () => (
    <>
      <RecurringMaintenance propertyId={propertyId} />
      <ComplianceCertificates propertyId={propertyId} />
    </>
  );

  const renderManageTab = () => (
    <>
      <TenantContacts propertyId={propertyId} />
      <TeamAccess propertyId={propertyId} />

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIONS</Text>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('EditProperty', { propertyId })}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name='create-outline' size={18} color='#3B82F6' />
          </View>
          <Text style={styles.actionText}>Edit Property</Text>
          <Ionicons
            name='chevron-forward'
            size={18}
            color={theme.colors.textTertiary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() =>
            navigation.navigate('PropertyAssessment', {
              propertyId,
              propertyAddress: property.address,
            })
          }
        >
          <View style={[styles.actionIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name='videocam-outline' size={18} color='#10B981' />
          </View>
          <Text style={styles.actionText}>Property Assessment</Text>
          <Ionicons
            name='chevron-forward'
            size={18}
            color={theme.colors.textTertiary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionRow} onPress={handleDelete}>
          <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name='trash-outline' size={18} color='#EF4444' />
          </View>
          <Text style={[styles.actionText, { color: '#EF4444' }]}>
            Delete Property
          </Text>
          <Ionicons
            name='chevron-forward'
            size={18}
            color={theme.colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.backgroundSecondary}
      />
      <ScreenHeader
        title='Property Details'
        showBack
        onBack={() => navigation.goBack()}
        rightComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => favoriteMutation.mutate()}
              accessibilityLabel={
                isFavorite ? 'Remove from favorites' : 'Add to favorites'
              }
              style={styles.headerBtn}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? '#EF4444' : theme.colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('EditProperty', { propertyId })
              }
              accessibilityLabel='Edit property'
              style={styles.headerBtn}
            >
              <Ionicons
                name='create-outline'
                size={22}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={
                activeTab === tab.key
                  ? theme.colors.primary
                  : theme.colors.textTertiary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Address card — always visible */}
        <View style={styles.addressCard}>
          <View style={styles.addressIconWrap}>
            <Ionicons name='home' size={24} color='#3B82F6' />
          </View>
          <Text style={styles.addressLine1}>{property.property_name}</Text>
          <Text style={styles.addressCity}>{property.address}</Text>
        </View>

        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'maintenance' && renderMaintenanceTab()}
        {activeTab === 'manage' && renderManageTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  content: { padding: 16 },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { padding: 2 },
  // Tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: theme.colors.primaryLight },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  tabTextActive: { color: theme.colors.primary },
  // Address
  addressCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
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
  addressIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLine1: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  addressCity: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
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
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statLabel: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 4 },
  // Section
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  infoLabel: { fontSize: 15, color: theme.colors.textSecondary },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  notesText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  // Jobs
  jobHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalSpentBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalSpentText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  emptyJobsWrap: { alignItems: 'center', paddingVertical: 20 },
  emptyJobsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyJobsText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  jobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  jobRowInfo: { flex: 1, marginRight: 12 },
  jobRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  jobRowDate: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  jobRowRight: { alignItems: 'flex-end', gap: 4 },
  jobRowBudget: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  // Action rows
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
});

export default PropertyDetailScreen;
