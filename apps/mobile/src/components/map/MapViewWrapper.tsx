import React, { ReactNode } from 'react';
import { View, Text, ViewProps } from 'react-native';

// Web-compatible fallback components (react-native-maps removed for web compatibility)
interface MapViewProps extends ViewProps {
  children?: ReactNode;
}

export const MapView: React.FC<MapViewProps> = ({ children, ...props }) => (
  <View style={{ flex: 1, backgroundColor: '#F7F7F7', justifyContent: 'center', alignItems: 'center' }} {...props}>
    <Text>Map view available on mobile devices</Text>
    {children}
  </View>
);

interface MarkerProps extends ViewProps {
  children?: ReactNode;
}

export const Marker: React.FC<MarkerProps> = ({ children, ...props }) => <View {...props}>{children}</View>;

export const PROVIDER_GOOGLE = 'google';

// Mock Region type for web compatibility
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
