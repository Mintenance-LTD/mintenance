import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { logger } from '../utils/logger';
import { mobileApiClient } from '../utils/mobileApiClient';
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
      // 2026-04-30 audit P0-1 follow-up: route through the API so the
      // contractor scope is enforced server-side. Previously this hook
      // hit `supabase.from('service_areas')` directly, which depended
      // entirely on RLS for row scoping and bypassed the
      // `withApiHandler` rate limit / role gate that POST/PATCH/DELETE
      // already use.
      const res = await mobileApiClient.get<{
        success: boolean;
        data: ServiceArea[];
      }>('/api/contractor/service-areas');
      setServiceAreas(res?.data ?? []);
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

  const handleCreateServiceArea = async (
    input: CreateServiceAreaInput
  ): Promise<void> => {
    if (!user?.id) return;
    await mobileApiClient.post('/api/contractor/service-areas', {
      area_name: input.area_name,
      area_type: 'radius',
      center_latitude: input.center_latitude || 0,
      center_longitude: input.center_longitude || 0,
      radius_km: input.radius_km,
      is_active: true,
    });
    await loadServiceAreas();
  };

  const handleToggleActive = async (area: ServiceArea) => {
    try {
      await mobileApiClient.patch(`/api/contractor/service-areas/${area.id}`, {
        is_active: !area.is_active,
      });
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
      await mobileApiClient.delete(
        `/api/contractor/service-areas/${selectedArea.id}`
      );
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
