import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ServiceAreasHeader } from '../components/service-areas/ServiceAreasHeader';
import { ServiceAreasStats } from '../components/service-areas/ServiceAreasStats';
import { ServiceAreasInsights } from '../components/service-areas/ServiceAreasInsights';
import { ServiceAreasList } from '../components/service-areas/ServiceAreasList';
import { ServiceAreasActions } from '../components/service-areas/ServiceAreasActions';
import { DeleteConfirmationModal } from '../components/service-areas/DeleteConfirmationModal';
import { useServiceAreas } from '../hooks/useServiceAreas';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { theme } from '../theme';

interface ServiceAreasScreenProps {
  navigation: StackNavigationProp<any>;
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
    handleRefresh,
    handleToggleActive,
    handleDeletePress,
    handleDeleteConfirm,
  } = useServiceAreas();

  if (loading) {
    return <LoadingSpinner message='Loading service areas...' />;
  }

  return (
    <View style={styles.container}>
      <ServiceAreasHeader navigation={navigation} />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <ServiceAreasStats serviceAreas={serviceAreas} />

        <ServiceAreasInsights serviceAreas={serviceAreas} />

        <ServiceAreasList
          serviceAreas={serviceAreas}
          navigation={navigation}
          onToggleActive={handleToggleActive}
          onDelete={handleDeletePress}
        />

        {serviceAreas.length > 0 && (
          <ServiceAreasActions navigation={navigation} />
        )}
      </ScrollView>

      <DeleteConfirmationModal
        visible={deleteModalVisible}
        selectedArea={selectedArea}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteConfirm}
      />
    </View>
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
