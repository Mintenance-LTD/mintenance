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
import { shouldRenderNativeMap as shouldRenderNativeMapUtil } from '../../../utils/mapAvailability';

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
  // Defensive numeric guard: Postgres NUMERIC columns are serialised
  // by supabase-js as strings, and prior versions of this file passed
  // them straight through to react-native-maps which crashed the
  // native Android module. Even after the route was fixed to coerce,
  // keep this guard so a future regression renders a graceful
  // "location unavailable" instead of crashing the JobDetails screen.
  const lat = typeof latitude === 'number' ? latitude : Number(latitude);
  const lng = typeof longitude === 'number' ? longitude : Number(longitude);
  const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lng);

  // 2026-05-23 audit: matches the guard already in ExploreMapScreen.
  // On Android without a Google Maps key the native MapView module
  // crashes on mount — and this component was rendering native maps
  // unconditionally, so opening any job with coordinates from an
  // un-keyed Android build crashed the JobDetails screen entirely.
  // Fall back to the address-only card in that case.
  //
  // 2026-05-27 audit-79 P2: helper reads both the JS env var AND the
  // build-time `extra.androidGoogleMapsConfigured` flag so the JS
  // guard agrees with what's actually in the native manifest.
  const shouldRenderNativeMap = shouldRenderNativeMapUtil();

  const handleGetDirections = () => {
    if (!hasValidCoords) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(address)})`,
    });
    if (url) Linking.openURL(url);
  };

  // Address-only fallback: no coords OR Android-without-key.
  if (!hasValidCoords || !shouldRenderNativeMap) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name='location' size={18} color={me.brand} />
          <Text style={styles.title}>Job Location</Text>
        </View>
        <Text style={styles.address}>{address}</Text>
        {hasValidCoords && (
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
        )}
      </View>
    );
  }

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
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} />
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
