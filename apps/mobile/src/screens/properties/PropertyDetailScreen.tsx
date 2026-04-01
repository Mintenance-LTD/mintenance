import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
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
import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { Property } from '@mintenance/types';
import type { ProfileStackParamList } from '../../navigation/types';
import { Badge } from '../../components/ui/Badge/Badge';
import { theme } from '../../theme';
import { styles, CATEGORY_ICONS } from './PropertyDetailStyles';
import { PropertyHealthScore } from './components/PropertyHealthScore';
import { SpendingAnalytics } from './components/SpendingAnalytics';
import { RecurringMaintenance } from './components/RecurringMaintenance';
import { TenantContacts } from './components/TenantContacts';
import { TeamAccess } from './components/TeamAccess';
import { ComplianceCertificates } from './components/ComplianceCertificates';

type Tab = 'overview' | 'maintenance' | 'manage';
interface Props {
  navigation: NativeStackNavigationProp<
    ProfileStackParamList,
    'PropertyDetail'
  >;
  route: RouteProp<ProfileStackParamList, 'PropertyDetail'>;
}

const TABS: {
  key: Tab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'overview', label: 'Overview', icon: 'home-outline' },
  { key: 'maintenance', label: 'Maintenance', icon: 'construct-outline' },
  { key: 'manage', label: 'Manage', icon: 'settings-outline' },
];

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
      const { data, error: queryError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();
      if (queryError) throw new Error(queryError.message);
      return data as Property;
    },
    enabled: !!user && !!propertyId,
  });

  const { data: jobsData } = useQuery({
    queryKey: ['property-jobs', propertyId],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('jobs')
        .select('id, title, status, budget, created_at, category')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      if (queryError) return [];
      return data ?? [];
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

  const formatType = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const renderOverviewTab = () => (
    <>
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

      <PropertyHealthScore jobs={propertyJobs} />

      <SpendingAnalytics jobs={propertyJobs} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PROPERTY INFORMATION</Text>
        <View style={styles.specGrid}>
          <View style={styles.specTile}>
            <View style={[styles.specTileIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name='business-outline' size={16} color='#3B82F6' />
            </View>
            <Text style={styles.specTileValue}>
              {formatType(property.property_type ?? 'N/A')}
            </Text>
            <Text style={styles.specTileLabel}>Type</Text>
          </View>
          <View style={styles.specTile}>
            <View style={[styles.specTileIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name='bed-outline' size={16} color='#8B5CF6' />
            </View>
            <Text style={styles.specTileValue}>{property.bedrooms ?? '-'}</Text>
            <Text style={styles.specTileLabel}>Bedrooms</Text>
          </View>
          <View style={styles.specTile}>
            <View style={[styles.specTileIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name='water-outline' size={16} color='#10B981' />
            </View>
            <Text style={styles.specTileValue}>
              {property.bathrooms ?? '-'}
            </Text>
            <Text style={styles.specTileLabel}>Bathrooms</Text>
          </View>
          <View style={styles.specTile}>
            <View style={[styles.specTileIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name='calendar-outline' size={16} color='#F59E0B' />
            </View>
            <Text style={styles.specTileValue}>
              {property.year_built ?? '-'}
            </Text>
            <Text style={styles.specTileLabel}>Year Built</Text>
          </View>
        </View>
        {property.square_footage != null && (
          <View style={styles.sizeRow}>
            <Ionicons
              name='resize-outline'
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.sizeText}>{property.square_footage} sq ft</Text>
          </View>
        )}
      </View>

      {property.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTES</Text>
          <Text style={styles.notesText}>{property.notes}</Text>
        </View>
      )}

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
          propertyJobs.map((job) => {
            const cat =
              CATEGORY_ICONS[(job.category || '').toLowerCase()] ||
              CATEGORY_ICONS.general;
            return (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() =>
                  (navigation as ReturnType<typeof Object>).navigate(
                    'JobsTab',
                    {
                      screen: 'JobDetails',
                      params: { jobId: job.id },
                    }
                  )
                }
                accessibilityRole='button'
                accessibilityLabel={`View ${job.title}`}
                activeOpacity={0.7}
              >
                <View style={[styles.jobCatIcon, { backgroundColor: cat.bg }]}>
                  <Ionicons name={cat.icon} size={18} color={cat.color} />
                </View>
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
            );
          })
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
        <View style={styles.addressCard}>
          <Text style={styles.addressSectionLabel}>PROPERTY IDENTITY</Text>
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

export default PropertyDetailScreen;
