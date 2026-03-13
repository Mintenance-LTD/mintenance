import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ServiceArea } from '../services/ServiceAreasService';

interface CreateServiceAreaInput {
  area_name: string;
  center_latitude: number;
  center_longitude: number;
  radius_km: number;
  is_primary_area: boolean;
}

export const useServiceAreas = () => {
  const { user } = useAuth();
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const loadServiceAreas = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .eq('contractor_id', user.id)
        .order('priority_level', { ascending: true });

      if (error) throw error;
      setServiceAreas((data as ServiceArea[]) ?? []);
    } catch (error) {
      logger.error('Error loading service areas', error);
      Alert.alert('Error', 'Failed to load service areas');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadServiceAreas();
  }, [loadServiceAreas]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadServiceAreas();
    setRefreshing(false);
  };

  const handleCreateServiceArea = async (input: CreateServiceAreaInput): Promise<void> => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('service_areas')
      .insert({
        contractor_id: user.id,
        area_name: input.area_name,
        area_type: 'radius',
        center_latitude: input.center_latitude,
        center_longitude: input.center_longitude,
        radius_km: input.radius_km,
        is_primary_area: input.is_primary_area,
        is_active: true,
      });
    if (error) throw error;
    await loadServiceAreas();
  };

  const handleToggleActive = async (area: ServiceArea) => {
    try {
      const { error } = await supabase
        .from('service_areas')
        .update({ is_active: !area.is_active })
        .eq('id', area.id);
      if (error) throw error;
      await loadServiceAreas();
      Alert.alert(
        'Updated',
        `Service area ${area.is_active ? 'deactivated' : 'activated'} successfully`
      );
    } catch {
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
      const { error } = await supabase
        .from('service_areas')
        .delete()
        .eq('id', selectedArea.id);
      if (error) throw error;
      await loadServiceAreas();
      Alert.alert('Deleted', 'Service area deleted successfully');
    } catch {
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
    createModalVisible,
    setCreateModalVisible,
    handleRefresh,
    handleCreateServiceArea,
    handleToggleActive,
    handleDeletePress,
    handleDeleteConfirm,
  };
};
