import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { theme } from '../theme';
import { AuthService } from '../services/AuthService';
import { mobileApiClient } from '../utils/mobileApiClient';

interface GeoAddr { house_number?: string; road?: string; city?: string; town?: string; village?: string; postcode?: string }
interface NominatimResult { lat: string; lon: string }

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Form state — pre-filled from profile on mount
  const [firstName, setFirstName] = useState(user?.first_name || user?.firstName || '');
  const [lastName, setLastName] = useState(user?.last_name || user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [locating, setLocating] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  // GPS coordinates captured when user taps "Use My Location"
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);

  // Load existing profile data on mount so address/bio fields are pre-filled
  useEffect(() => {
    if (!user) return;
    mobileApiClient
      .get<{ profile: { bio?: string; address?: string; city?: string; postcode?: string } }>(
        '/api/users/profile'
      )
      .then(res => {
        const p = res.profile;
        if (p.bio) setBio(p.bio);
        if (p.address) setAddress(p.address);
        if (p.city) setCity(p.city);
        if (p.postcode) setPostcode(p.postcode);
      })
      .catch(() => {
        // Non-critical — fields remain empty, user can type manually
      });
  }, [user?.id]);

  const handleUseMyLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow location access to use this feature.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      // Persist GPS coords so handleSave can write lat/lng to the profile
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
      Alert.alert('Error', 'Could not fetch your location. Please enter your address manually.');
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Resolve lat/lng: prefer GPS coords; fall back to forward-geocoding the typed address
      let latitude: number | undefined = gpsLat ?? undefined;
      let longitude: number | undefined = gpsLng ?? undefined;

      if (latitude == null && (address.trim() || city.trim() || postcode.trim())) {
        try {
          const q = [address.trim(), city.trim(), postcode.trim()].filter(Boolean).join(', ');
          const results = await mobileApiClient.get<NominatimResult[]>(
            `/api/geocoding/search?q=${encodeURIComponent(q)}`
          );
          if (results?.[0]) {
            latitude = parseFloat(results[0].lat);
            longitude = parseFloat(results[0].lon);
          }
        } catch {
          // Geocoding failed — save address text without coordinates
        }
      }

      const updates: Partial<{ first_name: string; last_name: string; phone: string; bio: string; address: string; city: string; postcode: string; latitude: number; longitude: number }> = {
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

      // Strip undefined values before sending to Supabase
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );

      if (user && Object.keys(filteredUpdates).length > 0) {
        await AuthService.updateUserProfile(user.id, filteredUpdates as Parameters<typeof AuthService.updateUserProfile>[1]);
        Alert.alert('Success', 'Profile updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        navigation.goBack();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update profile';
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
              Alert.alert('Email Sent', 'Check your inbox for the password reset link.');
            } catch {
              Alert.alert('Error', 'Failed to send password reset email. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'To permanently delete your account and all associated data, please contact our support team at support@mintenance.co.uk. This action cannot be undone.',
      [{ text: 'OK' }]
    );
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
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
        <Text style={styles.headerTitle} accessibilityRole='header'>Edit Profile</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
          accessibilityRole='button'
          accessibilityLabel={loading ? 'Saving profile changes' : 'Save profile changes'}
          accessibilityState={{ disabled: loading }}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.avatarContainer}>
            {(photoUri || user?.profile_image_url) ? (
              <Image
                source={{ uri: photoUri || user?.profile_image_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {firstName?.[0] || user?.first_name?.[0]}
                  {lastName?.[0] || user?.last_name?.[0]}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.photoEditButton}
              onPress={handlePickPhoto}
              accessibilityRole='button'
              accessibilityLabel='Change profile photo'
            >
              <Ionicons name='camera' size={20} color='#717171' />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.changePhotoButton}
            onPress={handlePickPhoto}
            accessibilityRole='button'
            accessibilityLabel='Change profile photo'
          >
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Input
            label='First Name'
            value={firstName}
            onChangeText={setFirstName}
            placeholder='Enter your first name'
            leftIcon='person-outline'
            variant='outline'
            size='lg'
            fullWidth
          />

          <Input
            label='Last Name'
            value={lastName}
            onChangeText={setLastName}
            placeholder='Enter your last name'
            leftIcon='person-outline'
            variant='outline'
            size='lg'
            fullWidth
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={user?.email || ''}
              editable={false}
              placeholderTextColor={theme.colors.textTertiary}
            />
            <Text style={styles.helperText}>
              Email changes require verification. Contact support at help@mintenance.co.uk to update your email.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder='Enter your phone number'
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType='phone-pad'
            />
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About You</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder={
                user?.role === 'contractor'
                  ? 'Tell homeowners about your experience and expertise...'
                  : 'Tell contractors about your project preferences...'
              }
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
            />
            <Text style={styles.helperText}>{bio.length}/200 characters</Text>
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>

          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleUseMyLocation}
            disabled={locating}
            accessibilityRole="button"
            accessibilityLabel="Use current GPS location to fill address"
          >
            {locating
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Ionicons name="location" size={18} color="#FFFFFF" />
            }
            <Text style={styles.locationButtonText}>
              {locating ? 'Detecting location...' : 'Use My Location'}
            </Text>
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. 42 High Street"
              placeholderTextColor={theme.colors.textTertiary}
              autoCorrect={false}
            />
          </View>

          <View style={styles.locationRow}>
            <View style={styles.locationRowLeft}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. London"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            <View style={styles.locationRowSpacer} />
            <View style={styles.locationRowRight}>
              <Text style={styles.label}>Postcode</Text>
              <TextInput
                style={styles.input}
                value={postcode}
                onChangeText={setPostcode}
                placeholder="e.g. SW1A 1AA"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Email Notifications</Text>
              <Text style={styles.switchDescription}>
                Receive updates about jobs and messages via email
              </Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{
                false: theme.colors.borderLight,
                true: theme.colors.success,
              }}
              thumbColor={theme.colors.textInverse}
              accessibilityLabel='Email notifications'
              accessibilityRole='switch'
              accessibilityState={{ checked: emailNotifications }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Push Notifications</Text>
              <Text style={styles.switchDescription}>
                Get instant notifications on your device
              </Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{
                false: theme.colors.borderLight,
                true: theme.colors.success,
              }}
              thumbColor={theme.colors.textInverse}
              accessibilityLabel='Push notifications'
              accessibilityRole='switch'
              accessibilityState={{ checked: pushNotifications }}
            />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleChangePassword}
            accessibilityRole='button'
            accessibilityLabel='Change password'
          >
            <View style={styles.actionLeft}>
              <Ionicons name='key-outline' size={20} color={theme.colors.textSecondary} />
              <Text style={styles.actionText}>Change Password</Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, styles.dangerAction]}
            onPress={handleDeleteAccount}
            accessibilityRole='button'
            accessibilityLabel='Delete account'
            accessibilityHint='This action cannot be undone'
          >
            <View style={styles.actionLeft}>
              <Ionicons name='trash-outline' size={20} color={theme.colors.error} />
              <Text style={[styles.actionText, styles.dangerText]}>
                Delete Account
              </Text>
            </View>
            <Ionicons name='chevron-forward' size={16} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.xxl,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#222222',
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  content: {
    flex: 1,
  },
  photoSection: {
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  photoEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  changePhotoButton: {
    paddingVertical: 8,
  },
  changePhotoText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
  },
  disabledInput: {
    backgroundColor: theme.colors.surfaceSecondary,
    color: theme.colors.textTertiary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 12,
    fontWeight: '500',
  },
  dangerAction: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: theme.colors.error,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222222',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 20,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  locationRowLeft: {
    flex: 3,
    marginBottom: 20,
  },
  locationRowSpacer: {
    width: 12,
  },
  locationRowRight: {
    flex: 2,
    marginBottom: 20,
  },
});

export default EditProfileScreen;
