import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/AuthService';
import { mobileApiClient } from '../utils/mobileApiClient';
import { PhotoSection } from './EditProfileSections/PhotoSection';
import { PersonalInfoSection } from './EditProfileSections/PersonalInfoSection';
import { LocationSection } from './EditProfileSections/LocationSection';
import { AvailabilitySection } from './EditProfileSections/AvailabilitySection';
import { theme } from '../theme';
import { logger } from '../utils/logger';

interface GeoAddr {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  postcode?: string;
}
interface NominatimResult {
  lat: string;
  lon: string;
}

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Form state - pre-filled from profile on mount
  const [firstName, setFirstName] = useState(
    user?.first_name || user?.firstName || ''
  );
  const [lastName, setLastName] = useState(
    user?.last_name || user?.lastName || ''
  );
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [locating, setLocating] = useState(false);
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Pre-fill via the canonical /api/users/profile endpoint —
        // returns the same fields the screen needs (bio, address,
        // city, postcode) plus latitude/longitude/profile_image_url.
        // Replaces the previous direct supabase read so RLS / shape
        // changes flow through one place.
        const profile = await mobileApiClient.get<{
          bio?: string | null;
          address?: string | null;
          city?: string | null;
          postcode?: string | null;
        }>('/api/users/profile');
        if (profile?.bio) setBio(profile.bio);
        if (profile?.address) setAddress(profile.address);
        if (profile?.city) setCity(profile.city);
        if (profile?.postcode) setPostcode(profile.postcode);
      } catch (err) {
        // Non-critical — fields remain empty, user can type manually
        logger.error('Failed to pre-fill profile fields', err);
      }
    })();
  }, [user?.id]);
  const handleUseMyLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Please allow location access to use this feature.'
        );
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setGpsLat(coords.latitude);
      setGpsLng(coords.longitude);

      const res = await mobileApiClient.get<{ address?: GeoAddr }>(
        `/api/geocoding/reverse?lat=${coords.latitude}&lon=${coords.longitude}`
      );
      const addr = res.address;
      if (addr) {
        const line1 = [addr.house_number, addr.road].filter(Boolean).join(' ');
        if (line1) setAddress(line1);
        const cityVal = addr.city || addr.town || addr.village || '';
        if (cityVal) setCity(cityVal);
        if (addr.postcode) setPostcode(addr.postcode.toUpperCase());
      }
    } catch {
      Alert.alert(
        'Error',
        'Could not fetch your location. Please enter your address manually.'
      );
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Upload the picked profile photo first (if any). The avatar
      // endpoint persists profile_image_url on the profiles row + cleans
      // up the previous file. Previously the picker only updated local
      // state and `handleSave` rebuilt an updates object that never
      // included the photo — selections were silently lost on save.
      let photoUploaded = false;
      if (photoUri) {
        try {
          const ext = photoUri.split('.').pop()?.toLowerCase() ?? 'jpg';
          const mime =
            ext === 'png'
              ? 'image/png'
              : ext === 'webp'
                ? 'image/webp'
                : 'image/jpeg';
          const formData = new FormData();
          formData.append('avatar', {
            uri: photoUri,
            name: `avatar-${Date.now()}.${ext}`,
            type: mime,
          } as unknown as Blob);
          await mobileApiClient.postFormData('/api/users/avatar', formData);
          photoUploaded = true;
        } catch (photoErr) {
          logger.error('Failed to upload profile photo', photoErr);
          Alert.alert(
            'Photo Upload Failed',
            'Your other profile changes will still be saved, but the photo could not be uploaded. Please try again later.'
          );
          // Continue with the rest of the save — non-fatal.
        }
      }

      let latitude: number | undefined = gpsLat ?? undefined;
      let longitude: number | undefined = gpsLng ?? undefined;

      if (
        latitude == null &&
        (address.trim() || city.trim() || postcode.trim())
      ) {
        try {
          const q = [address.trim(), city.trim(), postcode.trim()]
            .filter(Boolean)
            .join(', ');
          const results = await mobileApiClient.get<NominatimResult[]>(
            `/api/geocoding/search?q=${encodeURIComponent(q)}`
          );
          if (results?.[0]) {
            latitude = parseFloat(results[0].lat);
            longitude = parseFloat(results[0].lon);
          }
        } catch (geoErr) {
          // Geocoding failed — save address text without coordinates
          logger.error('Failed to geocode address for profile save', geoErr);
        }
      }

      const updates: Partial<{
        first_name: string;
        last_name: string;
        phone: string;
        bio: string;
        address: string;
        city: string;
        postcode: string;
        latitude: number;
        longitude: number;
      }> = {
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        postcode: postcode.trim().toUpperCase() || undefined,
        latitude,
        longitude,
      };

      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );

      if (user && Object.keys(filteredUpdates).length > 0) {
        await AuthService.updateUserProfile(
          user.id,
          filteredUpdates as Parameters<typeof AuthService.updateUserProfile>[1]
        );
      }
      // Refresh auth context so dashboard/header picks up name/phone /
      // avatar changes. Fires when either fields OR a photo were
      // saved — without this a photo-only save kept the old avatar in
      // the header until the next app reload.
      if (user && (Object.keys(filteredUpdates).length > 0 || photoUploaded)) {
        await refreshUser();
        Alert.alert('Success', 'Profile updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        navigation.goBack();
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Failed to update profile';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const email = user?.email;
    if (!email) {
      Alert.alert('Error', 'No email address associated with your account.');
      return;
    }
    Alert.alert(
      'Change Password',
      `A password reset link will be sent to ${email}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Link',
          onPress: async () => {
            try {
              await AuthService.resetPassword(email);
              Alert.alert(
                'Email Sent',
                'Check your inbox for the password reset link.'
              );
            } catch {
              Alert.alert(
                'Error',
                'Failed to send password reset email. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    // Routes to the registered DeleteAccount flow (same target the
    // SettingsHub uses) so both entry points share one self-service
    // path. The previous static "email support" alert was a dead end
    // and inconsistent with SettingsHub.
    (
      navigation as unknown as {
        navigate: (screen: string) => void;
      }
    ).navigate('DeleteAccount');
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Please allow access to your photo library.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.backgroundSecondary}
      />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole='header'>
          Edit Profile
        </Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
          accessibilityRole='button'
          accessibilityLabel={
            loading ? 'Saving profile changes' : 'Save profile changes'
          }
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <PhotoSection
          photoUri={photoUri}
          firstName={firstName}
          lastName={lastName}
          profileImageUrl={user?.profile_image_url}
          onPickPhoto={handlePickPhoto}
        />
        <PersonalInfoSection
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          email={user?.email || ''}
          phone={phone}
          setPhone={setPhone}
          bio={bio}
          setBio={setBio}
          userRole={user?.role}
        />
        <LocationSection
          address={address}
          setAddress={setAddress}
          city={city}
          setCity={setCity}
          postcode={postcode}
          setPostcode={setPostcode}
          locating={locating}
          onUseMyLocation={handleUseMyLocation}
        />
        <AvailabilitySection
          onChangePassword={handleChangePassword}
          onDeleteAccount={handleDeleteAccount}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  content: {
    flex: 1,
  },
});

export default EditProfileScreen;
