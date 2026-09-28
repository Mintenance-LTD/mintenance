import React from 'react';
import { View, Text } from 'react-native';
import { me } from '../../../design-system/mint-editorial';

/**
 * Web-compatible fallbacks for `react-native-maps`.
 *
 * Metro selects MapPlaceholder.native.tsx on Android and iOS. This
 * fallback keeps native-only map imports out of the web bundle.
 *
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44g).
 */

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export const MapView = React.forwardRef<
  View,
  {
    children?: React.ReactNode;
    style?: Record<string, unknown>;
    region?: MapRegion;
  }
>(function MapView({ children }, ref) {
  return (
    <View
      ref={ref}
      style={{
        flex: 1,
        backgroundColor: me.bg2,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text>Map view available on mobile devices</Text>
      {children}
    </View>
  );
});

export const Marker = ({
  children,
}: Record<string, unknown> & { children?: React.ReactNode }) => (
  <View>{children}</View>
);

export const Polyline = (_props: Record<string, unknown>) => <View />;
