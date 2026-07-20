import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import {
  travelPresentation,
  type TravelStage,
} from '../../../hooks/useContractorLiveLocation';
import { shouldRenderNativeMap as shouldRenderNativeMapUtil } from '../../../utils/mapAvailability';

interface ContractorLocation {
  latitude: number;
  longitude: number;
  heading?: number | null;
}

interface Props {
  address: string;
  latitude: number;
  longitude: number;
  /**
   * Optional live contractor position. When present (homeowner viewing an
   * assigned job whose contractor is sharing), the map adds a heading-
   * rotated contractor marker, a dashed line to the job, and auto-fits the
   * view to both points so the homeowner can watch them approach.
   *
   * When present this card also becomes the fused "on the way" hero: the
   * plain "Job Location" header is replaced by a live status strip (stage
   * headline + ETA/distance), so the tracking banner and the map are one card.
   */
  contractorLocation?: ContractorLocation | null;
  /**
   * Journey stage — drives both the live status strip copy and the badge
   * tint (Live → Nearby → Arriving → On site → Delayed). Defaults to
   * on_the_way.
   */
  stage?: TravelStage;
  /** Live ETA (minutes) for the hero subtitle. Only used when live. */
  eta?: number | null;
  /** Straight-line distance to the job in miles, for the hero subtitle. */
  distanceMiles?: number | null;
}

// Badge label + colours per stage. Kept in lock-step with the live hero
// header's tone so the homeowner sees one consistent signal.
function liveBadgeFor(stage: TravelStage): {
  label: string;
  fg: string;
  bg: string;
} {
  switch (stage) {
    case 'nearby':
      return { label: 'Nearby', fg: me.brand, bg: me.brandSoft };
    case 'arriving':
      return { label: 'Arriving', fg: me.okFg, bg: me.okBg };
    case 'arrived':
      return { label: 'On site', fg: me.okFg, bg: me.okBg };
    case 'late':
      return { label: 'Delayed', fg: me.warnFg, bg: me.warnBg };
    case 'on_the_way':
    case 'idle':
    default:
      return { label: 'Live', fg: me.brand, bg: me.brandSoft };
  }
}

const toneColor = (tone: 'brand' | 'ok' | 'warn'): string =>
  tone === 'ok' ? me.okFg : tone === 'warn' ? me.warnFg : me.brand;

export const JobLocationMap: React.FC<Props> = ({
  address,
  latitude,
  longitude,
  contractorLocation,
  stage = 'on_the_way',
  eta = null,
  distanceMiles = null,
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

  // Same coercion for the live contractor position.
  const contractor = useMemo(() => {
    if (!contractorLocation) return null;
    const cLat = Number(contractorLocation.latitude);
    const cLng = Number(contractorLocation.longitude);
    if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) return null;
    const heading =
      contractorLocation.heading != null
        ? Number(contractorLocation.heading)
        : null;
    return {
      latitude: cLat,
      longitude: cLng,
      heading: Number.isFinite(heading as number) ? heading : null,
    };
  }, [contractorLocation]);

  // Controlled region — fits both points when the contractor is en route so
  // the map follows them in; memoised so the static case never re-centers.
  const region = useMemo(() => {
    if (!contractor) {
      return {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };
    }
    const minLat = Math.min(lat, contractor.latitude);
    const maxLat = Math.max(lat, contractor.latitude);
    const minLng = Math.min(lng, contractor.longitude);
    const maxLng = Math.max(lng, contractor.longitude);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.01),
      longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.01),
    };
  }, [lat, lng, contractor]);

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

  const badge = liveBadgeFor(stage);

  // Plain header for the static (no live contractor) case.
  const renderStaticHeader = () => (
    <View style={styles.header}>
      <Ionicons name='location' size={18} color={me.brand} />
      <Text style={styles.title}>Job Location</Text>
    </View>
  );

  // Fused hero header: an avatar + stage headline/subtitle + stage-tinted
  // badge, replacing the plain "Job Location" row while the contractor is en
  // route. This is what makes the tracking banner and the map one card.
  const renderLiveHeader = () => {
    const p = travelPresentation(stage, { eta, distanceMiles });
    const accent = toneColor(p.tone);
    return (
      <View
        style={styles.liveHeader}
        accessibilityRole='header'
        accessibilityLabel={`${p.title}, ${p.subtitle}`}
      >
        <View style={[styles.avatar, { backgroundColor: accent }]}>
          <Ionicons name='navigate' size={18} color={me.onBrand} />
        </View>
        <View style={styles.liveHeaderText}>
          <Text style={styles.liveTitle} numberOfLines={1}>
            {p.title}
          </Text>
          <Text style={styles.liveSubtitle} numberOfLines={1}>
            {p.subtitle}
          </Text>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: badge.bg }]}>
          <View style={[styles.liveDot, { backgroundColor: badge.fg }]} />
          <Text style={[styles.liveBadgeText, { color: badge.fg }]}>
            {badge.label}
          </Text>
        </View>
      </View>
    );
  };

  const renderHeader = () =>
    contractor ? renderLiveHeader() : renderStaticHeader();

  // Address-only fallback: no coords OR Android-without-key.
  if (!hasValidCoords || !shouldRenderNativeMap) {
    return (
      <View style={styles.container}>
        {renderHeader()}
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
      {renderHeader()}
      <Text style={styles.address}>{address}</Text>
      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          region={region}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} />
          {contractor && (
            <>
              <Polyline
                coordinates={[
                  {
                    latitude: contractor.latitude,
                    longitude: contractor.longitude,
                  },
                  { latitude: lat, longitude: lng },
                ]}
                strokeColor={me.brand}
                strokeWidth={3}
                lineDashPattern={[6, 6]}
              />
              <Marker
                coordinate={{
                  latitude: contractor.latitude,
                  longitude: contractor.longitude,
                }}
                anchor={{ x: 0.5, y: 0.5 }}
                flat
                rotation={contractor.heading ?? 0}
                title='Contractor'
              >
                <View style={styles.contractorMarker}>
                  <Ionicons name='arrow-up' size={16} color={me.onBrand} />
                </View>
              </Marker>
            </>
          )}
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
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveHeaderText: {
    flex: 1,
  },
  liveTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
  },
  liveSubtitle: {
    fontSize: 12,
    color: me.ink3,
    marginTop: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: me.brandSoft,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: me.brand,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  contractorMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: me.onBrand,
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
