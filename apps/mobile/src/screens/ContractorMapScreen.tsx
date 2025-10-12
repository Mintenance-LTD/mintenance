import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { MapView, Marker, PROVIDER_GOOGLE, Region } from '../components/map/MapViewWrapper';
import { ContractorMarker } from '../components/map/ContractorMarker';
import { ContractorDetailsSheet } from '../components/map/ContractorDetailsSheet';
import { MapHeader } from '../components/map/MapHeader';
import { MapControls } from '../components/map/MapControls';
import { useContractorMap } from '../hooks/useContractorMap';
import { theme } from '../theme';
import { useHaptics } from '../utils/haptics';

interface ContractorMapParams {
  contractorId?: string;
  initialRegion?: Region;
}

interface Props {
  route?: RouteProp<{ params: ContractorMapParams }>;
  navigation: StackNavigationProp<any>;
}

const ContractorMapScreen: React.FC<Props> = ({ route, navigation }) => {
  const haptics = useHaptics();
  const { contractorId, initialRegion } = route?.params || {};

  const {
    mapRef,
    region,
    setRegion,
    contractors,
    selectedContractor,
    setSelectedContractor,
    searchQuery,
    loading,
    handleMarkerPress,
    handleGetDirections,
    handleContactContractor,
    handleCall,
    handleMessage,
    handleBookService,
    handleSearch,
    handleMyLocation,
  } = useContractorMap({ contractorId, initialRegion, navigation });

  const handleMarkerPressWithHaptics = (contractor: any) => {
    haptics.buttonPress();
    handleMarkerPress(contractor);
  };

  const handleGetDirectionsWithHaptics = (contractor: any) => {
    haptics.buttonPress();
    handleGetDirections(contractor);
  };

  const handleContactContractorWithHaptics = (contractor: any) => {
    haptics.buttonPress();
    handleContactContractor(contractor);
  };

  const handleMyLocationWithHaptics = () => {
    haptics.buttonPress();
    handleMyLocation();
  };

  return (
    <View style={styles.container}>
      <MapHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        onBackPress={() => navigation.goBack()}
        onFilterPress={() => {}}
      />

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {contractors.map((contractor) => (
          <Marker
            key={contractor.id}
            coordinate={contractor.coordinate}
            onPress={() => handleMarkerPressWithHaptics(contractor)}
          >
            <ContractorMarker
              contractor={contractor}
              isSelected={selectedContractor?.id === contractor.id}
              onPress={() => handleMarkerPressWithHaptics(contractor)}
            />
          </Marker>
        ))}
      </MapView>

      <MapControls
        loading={loading}
        onMyLocationPress={handleMyLocationWithHaptics}
      />

      <ContractorDetailsSheet
        contractor={selectedContractor}
        onClose={() => setSelectedContractor(null)}
        onContact={handleContactContractorWithHaptics}
        onCall={handleCall}
        onGetDirections={handleGetDirectionsWithHaptics}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  map: {
    flex: 1,
  },
});

export default ContractorMapScreen;
