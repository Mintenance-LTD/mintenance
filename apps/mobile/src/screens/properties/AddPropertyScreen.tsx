/**
 * AddPropertyScreen - Add a new property for homeowner
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/shared';
import { DatePicker } from '../../components/ui/DatePicker';
import { useAuth } from '../../contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { ProfileStackParamList } from '../../navigation/types';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { theme } from '../../theme';

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'AddProperty'>;
}

const PROPERTY_TYPES = [
  { value: 'house', label: 'House', icon: 'home-outline' as const },
  { value: 'flat', label: 'Flat', icon: 'business-outline' as const },
  { value: 'bungalow', label: 'Bungalow', icon: 'home-outline' as const },
  { value: 'maisonette', label: 'Maisonette', icon: 'layers-outline' as const },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const },
] as const;

export const AddPropertyScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [postcode, setPostcode] = useState('');
  const [propertyType, setPropertyType] = useState('house');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [locating, setLocating] = useState(false);
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();

  const hasUnsavedChanges = !!(address1 || city || postcode || notes || bedrooms || bathrooms);
  useUnsavedChanges(hasUnsavedChanges);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const address = [data.address_line1, data.address_line2, data.city, data.county, data.postcode]
        .filter(Boolean).join(', ');
      const propertyName = `${data.property_type || 'Property'} at ${data.address_line1}`;
      await mobileApiClient.post('/api/properties', {
        property_name: propertyName,
        address,
        property_type: 'residential',
        city: data.city,
        postcode: data.postcode,
        bedrooms: data.bedrooms || null,
        bathrooms: data.bathrooms || null,
        is_primary: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add property. Please try again.');
    },
  });

  const handleUseMyLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow location access to use this feature.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      const [result] = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      if (result) {
        const line1 = [result.streetNumber, result.street].filter(Boolean).join(' ');
        if (line1) setAddress1(line1);
        if (result.city) setCity(result.city);
        if (result.postalCode) setPostcode(result.postalCode.toUpperCase());
        if (result.region) setCounty(result.region);
      }
    } catch {
      Alert.alert('Error', 'Could not fetch your location. Please enter your address manually.');
    } finally {
      setLocating(false);
    }
  };

  const isValidPostcode = (code: string) =>
    /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(code.trim());

  const handleSubmit = () => {
    if (!address1.trim()) {
      Alert.alert('Required', 'Please enter the address line 1.');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Required', 'Please enter the city.');
      return;
    }
    if (!postcode.trim()) {
      Alert.alert('Required', 'Please enter the postcode.');
      return;
    }
    if (!isValidPostcode(postcode)) {
      Alert.alert('Invalid Postcode', 'Please enter a valid UK postcode (e.g. SW1A 1AA).');
      return;
    }

    createMutation.mutate({
      address_line1: address1.trim(),
      address_line2: address2.trim() || undefined,
      city: city.trim(),
      county: county.trim() || undefined,
      postcode: postcode.trim().toUpperCase(),
      country: 'GB',
      property_type: propertyType,
      bedrooms: bedrooms ? parseInt(bedrooms, 10) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms, 10) : undefined,
    });
  };

  const isValid = address1.trim() && city.trim() && postcode.trim();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Add Property"
        onBackPress={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADDRESS</Text>

            {/* Use current location */}
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleUseMyLocation}
              disabled={locating}
              accessibilityRole="button"
              accessibilityLabel="Use current location to fill address"
            >
              {locating
                ? <ActivityIndicator size="small" color={theme.colors.textInverse} />
                : <Ionicons name="location" size={18} color={theme.colors.textInverse} />
              }
              <Text style={styles.locationButtonText}>
                {locating ? 'Locating...' : 'Use Current Location'}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address Line 1 *</Text>
              <TextInput
                style={styles.input}
                value={address1}
                onChangeText={setAddress1}
                placeholder="e.g. 42 High Street"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address Line 2</Text>
              <TextInput
                style={styles.input}
                value={address2}
                onChangeText={setAddress2}
                placeholder="e.g. Apartment 3B"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. London"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
              <View style={styles.rowSpacer} />
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>County</Text>
                <TextInput
                  style={styles.input}
                  value={county}
                  onChangeText={setCounty}
                  placeholder="e.g. Greater London"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Postcode *</Text>
              <TextInput
                style={[styles.input, styles.postcodeInput]}
                value={postcode}
                onChangeText={setPostcode}
                placeholder="e.g. SW1A 1AA"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROPERTY TYPE</Text>
            <View style={styles.typeGrid}>
              {PROPERTY_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeChip,
                    propertyType === type.value && styles.typeChipSelected,
                  ]}
                  onPress={() => setPropertyType(type.value)}
                >
                  <Ionicons
                    name={type.icon}
                    size={18}
                    color={propertyType === type.value ? theme.colors.textInverse : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeChipText,
                      propertyType === type.value && styles.typeChipTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DETAILS</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>Bedrooms</Text>
                <TextInput
                  style={styles.input}
                  value={bedrooms}
                  onChangeText={setBedrooms}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.rowSpacer} />
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>Bathrooms</Text>
                <TextInput
                  style={styles.input}
                  value={bathrooms}
                  onChangeText={setBathrooms}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <DatePicker
              label="Purchase / Build Date"
              value={purchaseDate}
              onChange={setPurchaseDate}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTES</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes about the property..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || createMutation.isPending}
          >
            <Text style={styles.submitButtonText}>
              {createMutation.isPending ? 'Adding...' : 'Add Property'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  postcodeInput: {
    width: 160,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
  },
  rowSpacer: {
    width: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  typeChipSelected: {
    backgroundColor: theme.colors.textPrimary,
  },
  typeChipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  typeChipTextSelected: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 28,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 16,
  },
  locationButtonText: {
    color: theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: 17,
    fontWeight: '600',
  },
});

export default AddPropertyScreen;
