import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { ServiceAreasService, type ServiceArea } from '../services/ServiceAreasService';

export const useServiceAreas = () => {
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
      logger.error('Error loading service areas', error);
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
        is_active: !area.is_active,
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

  return {
    serviceAreas,
    loading,
    refreshing,
    selectedArea,
    deleteModalVisible,
    setDeleteModalVisible,
    handleRefresh,
    handleToggleActive,
    handleDeletePress,
    handleDeleteConfirm,
  };
};
