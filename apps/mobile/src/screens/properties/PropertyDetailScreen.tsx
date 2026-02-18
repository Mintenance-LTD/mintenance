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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { theme } from '../../theme';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient as apiClient } from '../../utils/mobileApiClient';
import type { Property } from '@mintenance/types';
import type { ProfileStackParamList } from '../../navigation/types';

interface Props {
  navigation: StackNavigationProp<ProfileStackParamList, 'PropertyDetail'>;
  route: RouteProp<ProfileStackParamList, 'PropertyDetail'>;
}

const InfoRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={18} color={theme.colors.textSecondary} />
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
            <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
        }
      >
        <View style={styles.addressCard}>
          <Ionicons name="home" size={32} color={theme.colors.primary} />
          <Text style={styles.addressLine1}>{property.property_name}</Text>
          <Text style={styles.addressCity}>
            {property.address}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Information</Text>

          <InfoRow
            icon="business-outline"
            label="Type"
            value={formatType(property.property_type)}
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
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{property.notes}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing[4],
  },
  addressCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[5],
    alignItems: 'center',
    marginBottom: theme.spacing[4],
    ...theme.shadows.sm,
  },
  addressLine1: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing[3],
    textAlign: 'center',
  },
  addressLine2: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
    textAlign: 'center',
  },
  addressCity: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
    textAlign: 'center',
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: theme.spacing[3],
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  notesText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});

export default PropertyDetailScreen;
