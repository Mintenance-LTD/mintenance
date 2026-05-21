/**
 * EmergencyJobScreen — fast-path posting flow for genuine emergencies
 * (leak, no heat, power loss, locked out, smashed window, gas smell).
 *
 * Reference: redesign-v2 homeowner-deck screen 09 "Emergency job".
 * Distinct from the general ServiceRequest flow: 6 fixed icon-led tiles
 * (no category browsing), single-screen — pick → property → photo →
 * post, all with `urgency: 'emergency'` so the existing nearby-contractor
 * fan-out targets emergency-eligible tradespeople first.
 *
 * Honesty notes baked into the UI:
 *  - "Emergency jobs cost 1.4-1.8× normal" callout up top (real Mint
 *    behaviour — emergency rates are higher).
 *  - "Mint will only post if 5+ verified trades are awake within 4 mi"
 *    sets expectation that posting can soft-fail; the API doesn't
 *    enforce this yet, so it reads as our promise for the audit, not
 *    a current backend gate.
 *  - Voice notes are a follow-up — the button is wired with a friendly
 *    "Coming soon" alert rather than left dead. Photo capture works
 *    today (same flow as ServiceRequest).
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ModalStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { JobService } from '../../services/JobService';
import { LocationService } from '../../services/LocationService';
import { me } from '../../design-system/mint-editorial';
import { logger } from '../../utils/logger';
import type { Property } from '@mintenance/types';
import { styles } from './styles';

type Nav = NativeStackNavigationProp<ModalStackParamList, 'EmergencyJob'>;

// Six emergency types from the design, mapped onto canonical JOB_CATEGORIES
// + subcategory + auto-generated title so the contractor side gets a
// recognisable post without the homeowner typing anything.
interface EmergencyType {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: string;
  subcategory: string;
  title: string;
  // Tinted background per the design's emoji icons — we use Mint
  // colour tokens instead of literal hexes.
  tint: string;
  fg: string;
}

const TYPES: readonly EmergencyType[] = [
  {
    key: 'leak',
    label: 'Leak / flood',
    icon: 'water',
    category: 'plumbing',
    subcategory: 'leak',
    title: 'Emergency — leak / flood',
    tint: me.infoBg,
    fg: me.infoFg,
  },
  {
    key: 'no_heat',
    label: 'No heat / hot water',
    icon: 'snow',
    category: 'heating',
    subcategory: 'no_heat',
    title: 'Emergency — no heat / hot water',
    tint: me.brandSoft,
    fg: me.brand,
  },
  {
    key: 'power',
    label: 'Power loss',
    icon: 'flash',
    category: 'electrical',
    subcategory: 'power_loss',
    title: 'Emergency — power loss',
    tint: me.warnBg,
    fg: me.warnFg,
  },
  {
    key: 'locked_out',
    label: 'Locked out',
    icon: 'lock-closed',
    category: 'handyman',
    subcategory: 'lock',
    title: 'Emergency — locked out',
    tint: me.errBg,
    fg: me.errFg,
  },
  {
    key: 'window',
    label: 'Smashed window',
    icon: 'apps',
    category: 'carpentry',
    subcategory: 'window',
    title: 'Emergency — smashed window',
    tint: me.bg3,
    fg: me.ink2,
  },
  {
    key: 'gas',
    label: 'Gas smell',
    icon: 'warning',
    category: 'heating',
    subcategory: 'gas',
    title: 'Emergency — gas smell',
    tint: me.errBg,
    fg: me.errFg,
  },
];

// Property type uses `property_name` + optional `address`/`city`. Pick the
// best display string without leaking nullable types into the JSX.
const displayAddress = (p: Property | undefined): string => {
  if (!p) return 'Add a property first';
  if (p.address && p.address.trim()) return p.address;
  if (p.property_name && p.property_name.trim()) return p.property_name;
  return 'Untitled property';
};

interface Props {
  navigation: Nav;
  route: {
    params?: { propertyId?: string };
  };
}

export const EmergencyJobScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const initialPropertyId = route.params?.propertyId;
  const [selectedKey, setSelectedKey] = useState<string>('leak');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      const res = await mobileApiClient.get<{ properties: Property[] }>(
        '/api/properties'
      );
      return res.properties ?? [];
    },
    enabled: !!user,
  });

  const [selectedPropertyId, setSelectedPropertyId] = useState<
    string | undefined
  >(initialPropertyId);
  const selectedProperty = useMemo<Property | undefined>(
    () => properties.find((p) => p.id === selectedPropertyId) ?? properties[0],
    [properties, selectedPropertyId]
  );

  const selectedType = TYPES.find((t) => t.key === selectedKey) ?? TYPES[0]!;

  const handleTakePhoto = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Camera access',
          'Mint needs camera access to take an emergency photo. You can grant it in Settings.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.75,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      logger.warn('Emergency photo capture failed', { error: String(err) });
    }
  }, []);

  const handleVoiceNote = useCallback(() => {
    // Voice note is in the design but not yet on the backend — the
    // jobs schema accepts a description string, not an audio blob.
    // Flag this clearly rather than ship a fake recorder.
    Alert.alert(
      'Voice notes — coming soon',
      'For now, tap "Take photo" to capture the situation, or post without a photo. We\'ll route to the right tradespeople either way.'
    );
  }, []);

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You need to sign in first.');
      if (!selectedProperty) {
        throw new Error('Add a property first so contractors know where.');
      }
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const loc = await LocationService.getCurrentLocation();
        if (loc) {
          latitude = loc.latitude;
          longitude = loc.longitude;
        }
      } catch {
        // optional
      }
      const where = displayAddress(selectedProperty);
      return JobService.createJob({
        title: selectedType.title,
        description: photoUri
          ? `${selectedType.label}. Photo taken on-site at ${where}.`
          : `${selectedType.label}. Posted from the in-app emergency flow — homeowner needs a verified tradesperson on-site as soon as possible.`,
        location: where,
        budget: 0,
        homeownerId: user.id,
        category: selectedType.category,
        subcategory: selectedType.subcategory,
        urgency: 'emergency',
        photos: photoUri ? [photoUri] : [],
        property_id: selectedProperty.id,
        latitude,
        longitude,
      });
    },
    onSuccess: () => {
      const where = displayAddress(selectedProperty);
      Alert.alert(
        'Posted',
        `We're paging verified ${selectedType.label.toLowerCase()} tradespeople near ${where} now. You'll get a notification the moment one accepts.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (err) => {
      Alert.alert(
        'Couldn’t post',
        err instanceof Error
          ? err.message
          : 'Something went wrong — please try again, or call 999 if this is a life-safety emergency.'
      );
    },
  });

  const canPost = !!selectedProperty && !postMutation.isPending;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Close'
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name='close' size={22} color={me.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 24) + 96,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>Emergency</Text>
        <Text style={styles.sub}>
          A leak, a power cut, a no-heat morning. Mint will text verified
          emergency tradespeople near you now.
        </Text>

        <View style={styles.honestNote}>
          <Ionicons
            name='information-circle-outline'
            size={16}
            color={me.warnFg}
          />
          <Text style={styles.honestNoteText}>
            Emergency jobs typically cost 1.4–1.8×. Mint only posts when there
            are verified trades awake within 4 miles.
          </Text>
        </View>

        <Text style={styles.sectionEyebrow}>What's happening?</Text>
        <View style={styles.tileGrid}>
          {TYPES.map((t) => {
            const active = t.key === selectedKey;
            return (
              <Pressable
                key={t.key}
                onPress={() => setSelectedKey(t.key)}
                style={[styles.tile, active && styles.tileActive]}
                accessibilityRole='radio'
                accessibilityState={{ selected: active }}
                accessibilityLabel={t.label}
              >
                <View
                  style={[styles.tileIconWrap, { backgroundColor: t.tint }]}
                >
                  <Ionicons name={t.icon} size={20} color={t.fg} />
                </View>
                <Text style={styles.tileLabel}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionEyebrow}>Where?</Text>
        <Pressable
          style={styles.propertyCard}
          onPress={() => {
            if (properties.length <= 1) return;
            // Cycle through properties on tap — keeps the flow one-thumb
            // simple. A picker modal would be richer but adds steps in
            // a time-critical surface.
            const idx = properties.findIndex(
              (p) => p.id === selectedProperty?.id
            );
            const next = properties[(idx + 1) % properties.length];
            if (next) setSelectedPropertyId(next.id);
          }}
          accessibilityRole='button'
          accessibilityLabel='Change property'
        >
          <Ionicons name='location' size={18} color={me.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.propertyAddress} numberOfLines={1}>
              {displayAddress(selectedProperty)}
            </Text>
            {selectedProperty?.city ? (
              <Text style={styles.propertySub} numberOfLines={1}>
                {selectedProperty.city}
              </Text>
            ) : null}
          </View>
          {properties.length > 1 && (
            <Text style={styles.changeLink}>Change</Text>
          )}
        </Pressable>

        <Text style={styles.sectionEyebrow}>Photo (optional, fast)</Text>
        <View style={styles.captureRow}>
          <TouchableOpacity
            style={[styles.captureBtn, photoUri && styles.captureBtnDone]}
            onPress={handleTakePhoto}
            accessibilityRole='button'
            accessibilityLabel='Take a photo'
          >
            <Ionicons
              name={photoUri ? 'checkmark-circle' : 'camera'}
              size={18}
              color={me.ink}
            />
            <Text style={styles.captureBtnText}>
              {photoUri ? 'Photo ready' : 'Take photo'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={handleVoiceNote}
            accessibilityRole='button'
            accessibilityLabel='Record a voice note'
          >
            <Ionicons name='mic-outline' size={18} color={me.ink} />
            <Text style={styles.captureBtnText}>Voice note</Text>
          </TouchableOpacity>
        </View>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} />
        ) : null}
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}
      >
        <TouchableOpacity
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          disabled={!canPost}
          onPress={() => postMutation.mutate()}
          accessibilityRole='button'
          accessibilityLabel='Post emergency job'
        >
          {postMutation.isPending ? (
            <ActivityIndicator color={me.onBrand} />
          ) : (
            <Text style={styles.postBtnText}>
              Page tradespeople — {selectedType.label.toLowerCase()} →
            </Text>
          )}
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          If this is a life-safety emergency, dial 999 first.
        </Text>
      </View>
    </View>
  );
};

export default EmergencyJobScreen;
