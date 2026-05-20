import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

interface Props {
  address: string;
  latitude: number;
  longitude: number;
}

export const JobLocationMap: React.FC<Props> = ({
  address,
  latitude,
  longitude,
}) => {
  const handleGetDirections = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(address)})`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name='location' size={18} color={me.brand} />
        <Text style={styles.title}>Job Location</Text>
      </View>
      <Text style={styles.address}>{address}</Text>
      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker coordinate={{ latitude, longitude }} />
        </MapView>
      </View>
      <TouchableOpacity
        style={styles.directionsBtn}
        onPress={handleGetDirections}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel='Get directions to job location'
      >
        <Ionicons name='navigate-outline' size={16} color={me.brand} />
        <Text style={styles.directionsText}>Get Directions</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: me.line,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
  },
  address: {
    fontSize: 14,
    color: me.ink2,
    marginBottom: 12,
    lineHeight: 20,
  },
  mapWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
    marginBottom: 12,
  },
  map: {
    flex: 1,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: me.brand,
  },
});
