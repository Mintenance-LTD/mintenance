import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMilesFromKm } from '@mintenance/shared';
import type { ContractorMeeting } from '@mintenance/types';
import type { ContractorLocation } from '../../../services/meeting/types';
import { me } from '../../../design-system/mint-editorial';
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
  const hasMeetingCoordinates =
    typeof meeting.latitude === 'number' &&
    Number.isFinite(meeting.latitude) &&
    typeof meeting.longitude === 'number' &&
    Number.isFinite(meeting.longitude) &&
    Math.abs(meeting.latitude) <= 90 &&
    Math.abs(meeting.longitude) <= 180;

  return (
    <View style={styles.mapSection}>
      <Text style={styles.sectionTitle}>Location & Tracking</Text>
      <View style={styles.mapContainer}>
        {region && hasMeetingCoordinates ? (
          <MapView region={region} style={{ flex: 1 }}>
            <Marker
              coordinate={{
                latitude: meeting.latitude ?? 0,
                longitude: meeting.longitude ?? 0,
              }}
              title='Meeting Location'
              description={meeting.address ?? ''}
              pinColor={me.ink}
            />

            {contractorLocation && (
              <Marker
                coordinate={{
                  latitude: contractorLocation.latitude,
                  longitude: contractorLocation.longitude,
                }}
                title='Contractor Location'
                description='Live location'
                pinColor={me.brand}
              >
                <View style={styles.contractorMarker}>
                  <Ionicons name='car' size={20} color={me.onBrand} />
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
                strokeColor={me.ink}
                strokeWidth={3}
                lineDashPattern={[5, 10]}
              />
            )}
          </MapView>
        ) : (
          <Text>Meeting location is not available yet.</Text>
        )}

        <View style={styles.locationOverlay}>
          {contractorLocation && distanceKm !== null && (
            <View style={styles.distanceInfo}>
              <Ionicons name='location' size={16} color={me.ink2} />
              <Text style={styles.distanceText}>
                {/* distance is km (as stored/queried); UI speaks miles. */}
                {formatMilesFromKm(distanceKm)} away
              </Text>
              {etaMinutes !== null ? (
                <Text style={styles.estimatedTime}>ETA: {etaMinutes} mins</Text>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
