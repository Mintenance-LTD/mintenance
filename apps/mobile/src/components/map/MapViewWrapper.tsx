import React from 'react';
import { View, Text } from 'react-native';

// Web-compatible fallback components (react-native-maps removed for web compatibility)
export const MapView = ({ children, ...props }: any) => (
  <View style={{ flex: 1, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
    <Text>Map view available on mobile devices</Text>
    {children}
  </View>
);

export const Marker = ({ children, ...props }: any) => <View {...props}>{children}</View>;

export const PROVIDER_GOOGLE = 'google';

// Mock Region type for web compatibility
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
