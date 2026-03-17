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
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
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
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const },
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

  const { data: property, isLoading, error, refetch } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      return await mobileApiClient.get<Property>(`/api/properties/${propertyId}`);
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
      setBathrooms(property.bathrooms != null ? String(property.bathrooms) : '');
      setYearBuilt(property.year_built != null ? String(property.year_built) : '');
      setSquareFootage(property.square_footage != null ? String(property.square_footage) : '');
      setNotes(property.notes || '');
    }
  }, [property]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await mobileApiClient.put(`/api/properties/${propertyId}`, {
        property_name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        postcode: postcode.trim().toUpperCase(),
        property_type: propertyType,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
        year_built: yearBuilt ? parseInt(yearBuilt, 10) : null,
        square_footage: squareFootage ? parseInt(squareFootage, 10) : null,
        notes: notes.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update property. Please try again.');
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

  if (isLoading) return <LoadingSpinner message="Loading property..." />;
  if (error) return <ErrorView message="Failed to load property" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Edit Property"
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROPERTY NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Property name"
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
                placeholder="e.g. 42 High Street"
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
                  placeholder="London"
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
                  placeholder="SW1A 1AA"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROPERTY TYPE</Text>
            <View style={styles.typeGrid}>
              {PROPERTY_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.typeChip, propertyType === type.value && styles.typeChipSelected]}
                  onPress={() => setPropertyType(type.value)}
                >
                  <Ionicons
                    name={type.icon}
                    size={18}
                    color={propertyType === type.value ? theme.colors.textInverse : theme.colors.textSecondary}
                  />
                  <Text style={[styles.typeChipText, propertyType === type.value && styles.typeChipTextSelected]}>
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
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>Year Built</Text>
                <TextInput
                  style={styles.input}
                  value={yearBuilt}
                  onChangeText={setYearBuilt}
                  placeholder="e.g. 2005"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.rowSpacer} />
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>Size (sq ft)</Text>
                <TextInput
                  style={styles.input}
                  value={squareFootage}
                  onChangeText={setSquareFootage}
                  placeholder="e.g. 1200"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="number-pad"
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
              placeholder="Any additional notes..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, updateMutation.isPending && styles.submitButtonDisabled]}
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
    fontSize: 12, fontWeight: '700', color: theme.colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: theme.colors.backgroundSecondary, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: theme.colors.textPrimary,
  },
  textArea: { minHeight: 100, paddingTop: 14 },
  row: { flexDirection: 'row' },
  rowSpacer: { width: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    paddingHorizontal: 14, borderRadius: 20, backgroundColor: theme.colors.backgroundSecondary,
  },
  typeChipSelected: { backgroundColor: theme.colors.textPrimary },
  typeChipText: { fontSize: 13, color: theme.colors.textSecondary, marginLeft: 6 },
  typeChipTextSelected: { color: theme.colors.textInverse, fontWeight: '600' },
  submitButton: {
    backgroundColor: theme.colors.primary, borderRadius: 28,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: theme.colors.textInverse, fontSize: 17, fontWeight: '600' },
});

export default EditPropertyScreen;
