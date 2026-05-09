import React from 'react';
import { View, Text } from 'react-native';
import { theme } from '../../../theme';

/**
 * Web-compatible fallbacks for `react-native-maps`.
 *
 * `react-native-maps` was removed for web compatibility — this file
 * provides typed shells so the screen renders a "Map view available
 * on mobile devices" placeholder. Native devices should swap these
 * imports for the real `react-native-maps` exports when needed.
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
  { children?: React.ReactNode; style?: Record<string, unknown> }
>(function MapView({ children }, ref) {
  return (
    <View
      ref={ref}
      style={{
        flex: 1,
        backgroundColor: theme.colors.backgroundSecondary,
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
