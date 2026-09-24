import React from 'react';
import { Text, View } from 'react-native';
import NativeMapView, { type MapViewProps } from 'react-native-maps';
import { shouldRenderNativeMap } from '../../../utils/mapAvailability';

export { Marker, Polyline } from 'react-native-maps';
export type { Region as MapRegion } from 'react-native-maps';

/** Native meeting maps use the same configuration gate as job discovery. */
export function MapView(props: MapViewProps) {
  if (!shouldRenderNativeMap()) {
    return (
      <View style={props.style} accessibilityRole='text'>
        <Text>Map unavailable. Use the meeting address for directions.</Text>
      </View>
    );
  }
  return <NativeMapView {...props} />;
}
