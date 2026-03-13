/**
 * PropertyDetailScreen - View and manage a single property
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient as apiClient } from '../../utils/mobileApiClient';
import type { Property } from '@mintenance/types';
import type { ProfileStackParamList } from '../../navigation/types';
import { Badge } from '../../components/ui/Badge';

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'PropertyDetail'>;
  route: RouteProp<ProfileStackParamList, 'PropertyDetail'>;
}

const InfoRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <Ionicons name={icon} size={16} color="#717171" />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

export const PropertyDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { propertyId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: property, isLoading, error, refetch } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => apiClient.get<Property>(`/api/properties/${propertyId}`),
    enabled: !!user && !!propertyId,
  });

  const { data: jobsData } = useQuery({
    queryKey: ['property-jobs', propertyId],
    queryFn: async () => {
      const res = await apiClient.get<{ jobs: Array<{ id: string; title: string; status: string; budget?: number; created_at: string }> }>(
        `/api/jobs?propertyId=${propertyId}`
      );
      return res.jobs || [];
    },
    enabled: !!user && !!propertyId,
  });

  const propertyJobs = jobsData || [];
  const totalSpent = propertyJobs
    .filter((j) => j.status === 'completed')
    .reduce((sum, j) => sum + (j.budget || 0), 0);

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/properties/${propertyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigation.goBack();
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

  if (isLoading) return <LoadingSpinner message="Loading property..." />;
  if (error) return <ErrorView message="Failed to load property" onRetry={refetch} />;
  if (!property) return <ErrorView message="Property not found" onRetry={refetch} />;

  const formatType = (type: string) =>
    type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Property Details"
        showBack
        onBack={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={handleDelete} accessibilityLabel="Delete property">
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#222222" colors={['#222222']} />
        }
      >
        <View style={styles.addressCard}>
          <View style={styles.addressIconWrap}>
            <Ionicons name="home" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.addressLine1}>{property.property_name}</Text>
          <Text style={styles.addressCity}>
            {property.address}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROPERTY INFORMATION</Text>

          <InfoRow
            icon="business-outline"
            label="Type"
            value={formatType(property.property_type ?? '')}
          />

          {property.bedrooms != null && (
            <InfoRow
              icon="bed-outline"
              label="Bedrooms"
              value={String(property.bedrooms)}
            />
          )}

          {property.bathrooms != null && (
            <InfoRow
              icon="water-outline"
              label="Bathrooms"
              value={String(property.bathrooms)}
            />
          )}

          {property.year_built != null && (
            <InfoRow
              icon="calendar-outline"
              label="Year Built"
              value={String(property.year_built)}
            />
          )}

          {property.square_footage != null && (
            <InfoRow
              icon="resize-outline"
              label="Size"
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
                  {'\u00A3'}{totalSpent.toLocaleString('en-GB')} spent
                </Text>
              </View>
            )}
          </View>
          {propertyJobs.length === 0 ? (
            <View style={styles.emptyJobsWrap}>
              <View style={styles.emptyJobsIcon}>
                <Ionicons name="briefcase-outline" size={20} color="#B0B0B0" />
              </View>
              <Text style={styles.emptyJobsText}>No jobs for this property yet.</Text>
            </View>
          ) : (
            propertyJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobRow}
                onPress={() => (navigation as any).navigate('JobsTab', { screen: 'JobDetails', params: { jobId: job.id } })}
                accessibilityRole="button"
                accessibilityLabel={`View ${job.title}`}
              >
                <View style={styles.jobRowInfo}>
                  <Text style={styles.jobRowTitle} numberOfLines={1}>{job.title}</Text>
                  <Text style={styles.jobRowDate}>
                    {new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.jobRowRight}>
                  {job.budget ? (
                    <Text style={styles.jobRowBudget}>{'\u00A3'}{job.budget.toLocaleString()}</Text>
                  ) : null}
                  <Badge
                    variant={job.status === 'completed' ? 'success' : job.status === 'in_progress' ? 'primary' : 'warning'}
                    size="sm"
                  >
                    {job.status === 'in_progress' ? 'In Progress' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </Badge>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  content: {
    padding: 16,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
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
    color: '#222222',
    marginTop: 12,
    textAlign: 'center',
  },
  addressCity: {
    fontSize: 15,
    color: '#717171',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0B0B0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: '#717171',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  notesText: {
    fontSize: 15,
    color: '#717171',
    lineHeight: 22,
  },
  jobHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalSpentBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalSpentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  emptyJobsWrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyJobsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyJobsText: {
    fontSize: 14,
    color: '#B0B0B0',
    textAlign: 'center',
  },
  jobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  jobRowInfo: {
    flex: 1,
    marginRight: 12,
  },
  jobRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  jobRowDate: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 2,
  },
  jobRowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  jobRowBudget: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
  },
});

export default PropertyDetailScreen;
