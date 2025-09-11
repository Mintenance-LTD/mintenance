import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { ServiceAreasService, ServiceArea } from '../services/ServiceAreasService';
import { ServiceAreaCard } from '../components/ServiceAreaCard';
import Button from '../components/ui/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface ServiceAreasScreenProps {
  navigation: StackNavigationProp<any>;
}

export const ServiceAreasScreen: React.FC<ServiceAreasScreenProps> = ({
  navigation
}) => {
  const { user } = useAuth();
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  useEffect(() => {
    loadServiceAreas();
  }, []);

  const loadServiceAreas = async () => {
    if (!user) return;
    
    try {
      const data = await ServiceAreasService.getServiceAreas(user.id);
      setServiceAreas(data);
    } catch (error) {
      console.error('Error loading service areas:', error);
      Alert.alert('Error', 'Failed to load service areas');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadServiceAreas();
    setRefreshing(false);
  };

  const handleToggleActive = async (area: ServiceArea) => {
    try {
      await ServiceAreasService.updateServiceArea(area.id, {
        is_active: !area.is_active
      });
      await loadServiceAreas();
      
      Alert.alert(
        'Success',
        `Service area ${area.is_active ? 'deactivated' : 'activated'} successfully`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update service area');
    }
  };

  const handleDeletePress = (area: ServiceArea) => {
    setSelectedArea(area);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedArea) return;

    try {
      await ServiceAreasService.deleteServiceArea(selectedArea.id);
      await loadServiceAreas();
      
      Alert.alert('Success', 'Service area deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete service area');
    } finally {
      setDeleteModalVisible(false);
      setSelectedArea(null);
    }
  };

  const activeAreas = serviceAreas.filter(area => area.is_active);
  const inactiveAreas = serviceAreas.filter(area => !area.is_active);
  const primaryArea = serviceAreas.find(area => area.is_primary_area);

  const renderStatsCard = (
    title: string,
    value: string | number,
    icon: string,
    color: string
  ) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
      </View>
    </View>
  );

  if (loading) {
    return <LoadingSpinner message="Loading service areas..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Areas</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateServiceArea')}
        >
          <Ionicons name="add" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics */}
        <View style={styles.statsContainer}>
          {renderStatsCard('Total Areas', serviceAreas.length, 'map', theme.colors.primary)}
          {renderStatsCard('Active', activeAreas.length, 'checkmark-circle', theme.colors.success)}
          {renderStatsCard('Inactive', inactiveAreas.length, 'pause-circle', theme.colors.textSecondary)}
          {renderStatsCard('Primary', primaryArea ? '1' : '0', 'star', theme.colors.warning)}
        </View>

        {/* Quick Insights */}
        {serviceAreas.length > 0 && (
          <View style={styles.insightsContainer}>
            <Text style={styles.insightsTitle}>Coverage Overview</Text>
            
            {primaryArea && (
              <View style={styles.insightItem}>
                <Ionicons name="star" size={16} color={theme.colors.warning} />
                <Text style={styles.insightText}>
                  Primary area: {primaryArea.area_name}
                </Text>
              </View>
            )}
            
            <View style={styles.insightItem}>
              <Ionicons name="speedometer" size={16} color={theme.colors.primary} />
              <Text style={styles.insightText}>
                Average response time: {Math.round(serviceAreas.reduce((sum, area) => sum + area.response_time_hours, 0) / serviceAreas.length)}h
              </Text>
            </View>
            
            <View style={styles.insightItem}>
              <Ionicons name="cash" size={16} color={theme.colors.success} />
              <Text style={styles.insightText}>
                Base travel charges: £{serviceAreas.reduce((sum, area) => sum + area.base_travel_charge, 0).toFixed(2)} total
              </Text>
            </View>
          </View>
        )}

        {/* Service Areas List */}
        <View style={styles.areasContainer}>
          <Text style={styles.sectionTitle}>Your Service Areas</Text>
          
          {serviceAreas.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={64} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>No service areas defined</Text>
              <Text style={styles.emptyText}>
                Create your first service area to start accepting jobs in your preferred locations
              </Text>
              <Button
                variant="primary"
                title="Create Service Area"
                onPress={() => navigation.navigate('CreateServiceArea')}
              />
            </View>
          ) : (
            <>
              {/* Active Areas */}
              {activeAreas.length > 0 && (
                <>
                  <Text style={styles.subsectionTitle}>
                    Active Areas ({activeAreas.length})
                  </Text>
                  {activeAreas.map((area) => (
                    <ServiceAreaCard
                      key={area.id}
                      serviceArea={area}
                      onPress={() => navigation.navigate('ServiceAreaDetail', { areaId: area.id })}
                      onEdit={() => navigation.navigate('EditServiceArea', { areaId: area.id })}
                      onToggleActive={() => handleToggleActive(area)}
                      onDelete={() => handleDeletePress(area)}
                    />
                  ))}
                </>
              )}

              {/* Inactive Areas */}
              {inactiveAreas.length > 0 && (
                <>
                  <Text style={styles.subsectionTitle}>
                    Inactive Areas ({inactiveAreas.length})
                  </Text>
                  {inactiveAreas.map((area) => (
                    <ServiceAreaCard
                      key={area.id}
                      serviceArea={area}
                      onPress={() => navigation.navigate('ServiceAreaDetail', { areaId: area.id })}
                      onEdit={() => navigation.navigate('EditServiceArea', { areaId: area.id })}
                      onToggleActive={() => handleToggleActive(area)}
                      onDelete={() => handleDeletePress(area)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </View>

        {/* Quick Actions */}
        {serviceAreas.length > 0 && (
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>Quick Actions</Text>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ServiceAreaAnalytics')}
            >
              <Ionicons name="analytics" size={24} color={theme.colors.primary} />
              <Text style={styles.actionButtonText}>View Analytics</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('RouteOptimization')}
            >
              <Ionicons name="map" size={24} color={theme.colors.primary} />
              <Text style={styles.actionButtonText}>Route Planning</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('CoverageMap')}
            >
              <Ionicons name="location" size={24} color={theme.colors.primary} />
              <Text style={styles.actionButtonText}>Coverage Map</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Service Area</Text>
            {selectedArea && (
              <Text style={styles.modalText}>
                Are you sure you want to delete "{selectedArea.area_name}"? This action cannot be undone.
              </Text>
            )}
            <View style={styles.modalActions}>
              <Button
                variant="secondary"
                title="Cancel"
                onPress={() => setDeleteModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                variant="danger"
                title="Delete"
                onPress={handleDeleteConfirm}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    color: theme.colors.textInverse,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderLeftWidth: 4,
    ...theme.shadows.base,
  },
  statContent: {
    marginLeft: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  insightsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.base,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  areasContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
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
  // createButton styles replaced by shared Button
  actionsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 32,
    ...theme.shadows.base,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.surfaceSecondary,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginLeft: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  // modal buttons replaced by shared Button
});

export default ServiceAreasScreen;
