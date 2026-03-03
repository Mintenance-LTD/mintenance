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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenHeader } from '../../components/shared';
import { DatePicker } from '../../components/ui/DatePicker';
import { useAuth } from '../../contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient as apiClient } from '../../utils/mobileApiClient';
import type { ProfileStackParamList } from '../../navigation/types';

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

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post('/api/properties', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add property. Please try again.');
    },
  });

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
      purchase_date: purchaseDate ? purchaseDate.toISOString().split('T')[0] : undefined,
      notes: notes.trim() || undefined,
    });
  };

  const isValid = address1.trim() && city.trim() && postcode.trim();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Add Property"
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>

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
            <Text style={styles.sectionTitle}>Property Type</Text>
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
            <Text style={styles.sectionTitle}>Details</Text>
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
            <Text style={styles.sectionTitle}>Notes</Text>
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
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[3],
  },
  inputGroup: {
    marginBottom: theme.spacing[3],
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[1],
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  postcodeInput: {
    width: 160,
  },
  textArea: {
    minHeight: 100,
    paddingTop: theme.spacing[3],
  },
  row: {
    flexDirection: 'row',
  },
  rowSpacer: {
    width: theme.spacing[3],
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  typeChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeChipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing[1],
  },
  typeChipTextSelected: {
    color: theme.colors.textInverse,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing[4],
    alignItems: 'center',
    marginTop: theme.spacing[2],
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

export default AddPropertyScreen;

