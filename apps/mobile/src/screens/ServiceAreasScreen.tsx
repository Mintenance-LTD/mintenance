import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { ServiceAreasHeader } from '../components/service-areas/ServiceAreasHeader';
import { ServiceAreasStats } from '../components/service-areas/ServiceAreasStats';
import { ServiceAreasInsights } from '../components/service-areas/ServiceAreasInsights';
import { ServiceAreasList } from '../components/service-areas/ServiceAreasList';
import { ServiceAreasActions } from '../components/service-areas/ServiceAreasActions';
import { DeleteConfirmationModal } from '../components/service-areas/DeleteConfirmationModal';
import { CreateServiceAreaModal } from '../components/service-areas/CreateServiceAreaModal';
import { useServiceAreas } from '../hooks/useServiceAreas';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { theme } from '../theme';

interface ServiceAreasScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ServiceAreas'>;
}

export const ServiceAreasScreen: React.FC<ServiceAreasScreenProps> = ({
  navigation,
}) => {
  const {
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
  } = useServiceAreas();

  if (loading) {
    return <LoadingSpinner message='Loading service areas...' />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ServiceAreasHeader
        navigation={navigation}
        onAddPress={() => setCreateModalVisible(true)}
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor='#222222' colors={['#222222']} />
        }
        showsVerticalScrollIndicator={false}
      >
        <ServiceAreasStats serviceAreas={serviceAreas} />

        <ServiceAreasInsights serviceAreas={serviceAreas} />

        <ServiceAreasList
          serviceAreas={serviceAreas}
          onToggleActive={handleToggleActive}
          onDelete={handleDeletePress}
          onCreatePress={() => setCreateModalVisible(true)}
        />

        {serviceAreas.length > 0 && (
          <ServiceAreasActions />
        )}
      </ScrollView>

      <DeleteConfirmationModal
        visible={deleteModalVisible}
        selectedArea={selectedArea}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteConfirm}
      />

      <CreateServiceAreaModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={() => setCreateModalVisible(false)}
        onCreate={handleCreateServiceArea}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export default ServiceAreasScreen;
