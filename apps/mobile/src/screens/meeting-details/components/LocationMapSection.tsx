import React, { useRef } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ContractorMeeting } from '@mintenance/types';
import type { ContractorLocation } from '../../../services/meeting/types';
import { theme } from '../../../theme';
import { styles } from '../../meetingDetailsStyles';
import { MapView, Marker, Polyline, type MapRegion } from './MapPlaceholder';

/**
 * Map + meeting/contractor markers + distance/ETA overlay.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44g).
 */
export function LocationMapSection({
  meeting,
  region,
  contractorLocation,
  distanceKm,
  etaMinutes,
}: {
  meeting: ContractorMeeting;
  region: MapRegion | null;
  contractorLocation: ContractorLocation | null;
  distanceKm: number | null;
  etaMinutes: number | null;
}) {
  const mapRef = useRef<View>(null);

  return (
    <View style={styles.mapSection}>
      <Text style={styles.sectionTitle}>Location & Tracking</Text>
      <View style={styles.mapContainer}>
        {region && (
          <MapView ref={mapRef} style={{ flex: 1 }}>
            <Marker
              coordinate={{
                latitude: meeting.latitude ?? 0,
                longitude: meeting.longitude ?? 0,
              }}
              title='Meeting Location'
              description={meeting.address ?? ''}
              pinColor={theme.colors.textPrimary}
            />

            {contractorLocation && (
              <Marker
                coordinate={{
                  latitude: contractorLocation.latitude,
                  longitude: contractorLocation.longitude,
                }}
                title='Contractor Location'
                description='Live location'
                pinColor={theme.colors.primary}
              >
                <View style={styles.contractorMarker}>
                  <Ionicons
                    name='car'
                    size={20}
                    color={theme.colors.textInverse}
                  />
                </View>
              </Marker>
            )}

            {contractorLocation && (
              <Polyline
                coordinates={[
                  {
                    latitude: contractorLocation.latitude,
                    longitude: contractorLocation.longitude,
                  },
                  {
                    latitude: meeting.latitude ?? 0,
                    longitude: meeting.longitude ?? 0,
                  },
                ]}
                strokeColor={theme.colors.textPrimary}
                strokeWidth={3}
                lineDashPattern={[5, 10]}
              />
            )}
          </MapView>
        )}

        <View style={styles.locationOverlay}>
          {contractorLocation && distanceKm !== null && (
            <View style={styles.distanceInfo}>
              <Ionicons
                name='location'
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.distanceText}>
                {distanceKm.toFixed(1)} km away
              </Text>
              {etaMinutes !== null ? (
                <Text style={styles.estimatedTime}>ETA: {etaMinutes} mins</Text>
              ) : (
                <Text style={styles.estimatedTime}>
                  ~{Math.round(distanceKm * 2)} mins
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
