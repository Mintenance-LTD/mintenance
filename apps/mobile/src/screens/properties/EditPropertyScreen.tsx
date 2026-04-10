/**
 * EditPropertyScreen - Edit an existing property's details
 */
import React, { useState, useEffect } from 'react';
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
import { RouteProp } from '@react-navigation/native';
import {
  ScreenHeader,
  LoadingSpinner,
  ErrorView,
} from '../../components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { Property } from '@mintenance/types';
import type { ProfileStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'EditProperty'>;
  route: RouteProp<ProfileStackParamList, 'EditProperty'>;
}

const PROPERTY_TYPES = [
  { value: 'house', label: 'House', icon: 'home-outline' as const },
  { value: 'flat', label: 'Flat', icon: 'business-outline' as const },
  { value: 'bungalow', label: 'Bungalow', icon: 'home-outline' as const },
  { value: 'maisonette', label: 'Maisonette', icon: 'layers-outline' as const },
  {
    value: 'other',
    label: 'Other',
    icon: 'ellipsis-horizontal-outline' as const,
  },
] as const;

export const EditPropertyScreen: React.FC<Props> = ({ navigation, route }) => {
  const { propertyId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [propertyType, setPropertyType] = useState('house');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [squareFootage, setSquareFootage] = useState('');
  const [notes, setNotes] = useState('');

  const {
    data: property,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const { data, error: queryError } = await (
        await import('../../config/supabase')
      ).supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();
      if (queryError) throw new Error(queryError.message);
      return data as Property;
    },
    enabled: !!user && !!propertyId,
  });

  useEffect(() => {
    if (property) {
      setName(property.property_name || '');
      setAddress(property.address || '');
      setCity(property.city || '');
      setPostcode(property.postcode || '');
      setPropertyType(property.property_type || 'house');
      setBedrooms(property.bedrooms != null ? String(property.bedrooms) : '');
      setBathrooms(
        property.bathrooms != null ? String(property.bathrooms) : ''
      );
      setYearBuilt(
        property.year_built != null ? String(property.year_built) : ''
      );
      setSquareFootage(
        property.square_footage != null ? String(property.square_footage) : ''
      );
      setNotes(property.notes || '');
    }
  }, [property]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await mobileApiClient.put(`/api/properties/${propertyId}`, {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        postcode: postcode.trim().toUpperCase(),
        type: propertyType,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt, 10) : null,
        squareFeet: squareFootage ? parseInt(squareFootage, 10) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigation.goBack();
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to update property. Please try again.';
      Alert.alert('Error', msg);
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a property name.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Required', 'Please enter the address.');
      return;
    }
    updateMutation.mutate();
  };

  if (isLoading) return <LoadingSpinner message='Loading property...' />;
  if (error)
    return <ErrorView message='Failed to load property' onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenLabel}>
        <Text style={styles.screenLabelText}>PROPERTY MANAGEMENT</Text>
      </View>
      <ScreenHeader
        title='Refine Details'
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROPERTY NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder='Property name'
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADDRESS</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Address *</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder='e.g. 42 High Street'
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder='London'
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
              <View style={styles.rowSpacer} />
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>Postcode</Text>
                <TextInput
                  style={styles.input}
                  value={postcode}
                  onChangeText={setPostcode}
                  placeholder='SW1A 1AA'
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize='characters'
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROPERTY TYPE</Text>
            <View style={styles.typeGrid}>
              {PROPERTY_TYPES.map((type) => (
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
                    color={
                      propertyType === type.value
                        ? theme.colors.textInverse
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.typeChipText,
                      propertyType === type.value &&
                        styles.typeChipTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROPERTY SPECS</Text>
            <View style={styles.specGrid}>
              <View style={styles.specCard}>
                <View
                  style={[styles.specIconWrap, { backgroundColor: '#DBEAFE' }]}
                >
                  <Ionicons name='bed-outline' size={18} color='#3B82F6' />
                </View>
                <Text style={styles.specLabel}>Bedrooms</Text>
                <TextInput
                  style={styles.specInput}
                  value={bedrooms}
                  onChangeText={setBedrooms}
                  placeholder='0'
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType='number-pad'
                  textAlign='center'
                />
              </View>
              <View style={styles.specCard}>
                <View
                  style={[styles.specIconWrap, { backgroundColor: '#D1FAE5' }]}
                >
                  <Ionicons name='water-outline' size={18} color='#10B981' />
                </View>
                <Text style={styles.specLabel}>Bathrooms</Text>
                <TextInput
                  style={styles.specInput}
                  value={bathrooms}
                  onChangeText={setBathrooms}
                  placeholder='0'
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType='number-pad'
                  textAlign='center'
                />
              </View>
              <View style={styles.specCard}>
                <View
                  style={[styles.specIconWrap, { backgroundColor: '#FEF3C7' }]}
                >
                  <Ionicons name='calendar-outline' size={18} color='#F59E0B' />
                </View>
                <Text style={styles.specLabel}>Year Built</Text>
                <TextInput
                  style={styles.specInput}
                  value={yearBuilt}
                  onChangeText={setYearBuilt}
                  placeholder='2005'
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType='number-pad'
                  textAlign='center'
                />
              </View>
              <View style={styles.specCard}>
                <View
                  style={[styles.specIconWrap, { backgroundColor: '#EDE9FE' }]}
                >
                  <Ionicons name='resize-outline' size={18} color='#8B5CF6' />
                </View>
                <Text style={styles.specLabel}>Size (sq ft)</Text>
                <TextInput
                  style={styles.specInput}
                  value={squareFootage}
                  onChangeText={setSquareFootage}
                  placeholder='1200'
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType='number-pad'
                  textAlign='center'
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTES</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder='Any additional notes...'
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical='top'
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              updateMutation.isPending && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={updateMutation.isPending}
          >
            <Text style={styles.submitButtonText}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  screenLabel: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  screenLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  inputGroup: { marginBottom: 12 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: { minHeight: 100, paddingTop: 14 },
  row: { flexDirection: 'row' },
  rowSpacer: { width: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  typeChipSelected: { backgroundColor: theme.colors.textPrimary },
  typeChipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  typeChipTextSelected: { color: theme.colors.textInverse, fontWeight: '600' },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specCard: {
    width: '48%' as unknown as number,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  specIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  specLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  specInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  submitButton: {
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
