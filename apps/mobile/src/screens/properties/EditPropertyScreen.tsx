/**
 * EditPropertyScreen - Edit an existing property's details
 */
import { PropertyChoice } from '../../components/properties/PropertyChoice';
import {
  PropertySegments,
  workspaceStyles as ws,
} from './components/PropertyWorkspaceUI';
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
import { me } from '../../design-system/mint-editorial';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

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
  // 2026-05-27 audit-74 P3: defensive guard — bad deep link or
  // notification fallback into EditProperty without params used to
  // crash on destructure. Same pattern as PropertyDetailScreen and
  // BidSubmissionScreen.
  const params = route.params as { propertyId?: string } | undefined;
  const propertyId = params?.propertyId;
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
  const [areaUnit, setAreaUnit] = React.useState<'sqft' | 'sqm'>('sqft');
  const [squareFootage, setSquareFootage] = useState('');
  // 2026-05-27 audit-74 P1: removed dead notes state — `properties`
  // has no notes column; the create/PUT payloads never sent it; the
  // edit field silently lost user input. Access instructions live on
  // the Access tab (access_notes column).
  // Track whether the user has made edits since the form hydrated.
  // We intentionally don't compare current values to `property.*` —
  // that comparison breaks when null DB columns hydrate to '' which
  // looks identical to user-typed empty strings.
  const [hasEdits, setHasEdits] = useState(false);
  const allowExit = useUnsavedChanges(hasEdits);

  const {
    data: property,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['property', propertyId, user?.id],
    retry: false,
    queryFn: async () => {
      // Route through the API so ownership is authoritatively checked
      // server-side (via PropertyTeamService) and RLS isn't the sole guard.
      return await mobileApiClient.get<Property & { _role?: string }>(
        `/api/properties/${propertyId}`
      );
    },
    enabled: !!user && !!propertyId,
  });

  useEffect(() => {
    setHasEdits(false);
    setName('');
    setAddress('');
    setCity('');
    setPostcode('');
    setBedrooms('');
    setBathrooms('');
    setYearBuilt('');
    setSquareFootage('');
  }, [user?.id, propertyId]);

  useEffect(() => {
    if (property && !hasEdits) {
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
      setAreaUnit('sqft');
      setSquareFootage(
        property.square_footage != null ? String(property.square_footage) : ''
      );
    }
  }, [property, hasEdits]);

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
        squareFeet: squareFootage
          ? Math.round(
              Number(squareFootage) * (areaUnit === 'sqm' ? 10.7639104167 : 1)
            )
          : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setHasEdits(false);
      allowExit();
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
    if (updateMutation.isPending) return;
    if (
      [bedrooms, bathrooms, yearBuilt].some(
        (value) => value.trim() && !/^\d+$/.test(value.trim())
      )
    ) {
      Alert.alert(
        'Check property details',
        'Enter whole numbers of zero or more for rooms, year and floor area.'
      );
      return;
    }
    if (
      squareFootage.trim() &&
      (!/^\d+(\.\d+)?$/.test(squareFootage.trim()) ||
        !Number.isFinite(Number(squareFootage)))
    ) {
      Alert.alert(
        'Check floor area',
        'Enter a positive floor area or leave it blank.'
      );
      return;
    }
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a property name.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Required', 'Please enter the address.');
      return;
    }
    // 2026-06-06 audit: EditProperty skipped the UK-postcode validation
    // AddProperty enforces, so an invalid postcode could be saved here and
    // break geocoding / contractor radius matching. Validate when present.
    if (
      postcode.trim() &&
      !/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(postcode.trim())
    ) {
      Alert.alert(
        'Invalid Postcode',
        'Please enter a valid UK postcode (e.g. SW1A 1AA).'
      );
      return;
    }
    updateMutation.mutate();
  };

  // audit-74 P3: explicit missing-propertyId render path.
  if (!propertyId)
    return (
      <ErrorView
        message='Property reference missing. Please open the property from your portfolio.'
        onRetry={() => navigation.goBack()}
      />
    );
  if (isLoading) return <LoadingSpinner message='Loading property...' />;
  if (error)
    return <ErrorView message='Failed to load property' onRetry={refetch} />;
  if (
    !property ||
    !['owner', 'platform_admin', 'admin', 'manager'].includes(
      property._role ?? ''
    )
  )
    return (
      <ErrorView
        message='You do not have permission to edit this property.'
        onRetry={() => navigation.goBack()}
      />
    );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title='Edit property'
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
          <View style={{ gap: 20 }}>
            <View>
              <Text style={styles.label}>Name</Text>
              <TextInput
                accessibilityLabel='Property name'
                style={styles.input}
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  setHasEdits(true);
                }}
                placeholder='Property name'
                placeholderTextColor={me.ink3}
              />
            </View>
            <View>
              <Text style={styles.label}>Address</Text>
              <TextInput
                accessibilityLabel='Address'
                style={styles.input}
                value={address}
                onChangeText={(v) => {
                  setAddress(v);
                  setHasEdits(true);
                }}
                placeholder='e.g. 42 High Street'
                placeholderTextColor={me.ink3}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  accessibilityLabel='City'
                  style={styles.input}
                  value={city}
                  onChangeText={(v) => {
                    setCity(v);
                    setHasEdits(true);
                  }}
                  placeholder='London'
                  placeholderTextColor={me.ink3}
                />
              </View>
              <View style={styles.rowSpacer} />
              <View style={styles.flex}>
                <Text style={styles.label}>Postcode</Text>
                <TextInput
                  accessibilityLabel='Postcode'
                  style={styles.input}
                  value={postcode}
                  onChangeText={(v) => {
                    setPostcode(v);
                    setHasEdits(true);
                  }}
                  placeholder='SW1A 1AA'
                  placeholderTextColor={me.ink3}
                  autoCapitalize='characters'
                />
              </View>
            </View>
            <View>
              <Text style={styles.label}>Property type</Text>
              <PropertyChoice
                label='Property type'
                value={propertyType}
                options={PROPERTY_TYPES}
                onChange={(v) => {
                  setPropertyType(v);
                  setHasEdits(true);
                }}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.label}>Bedrooms</Text>
                <RoomStepper
                  label='Bedrooms'
                  value={bedrooms}
                  onChange={(v) => {
                    setBedrooms(v);
                    setHasEdits(true);
                  }}
                />
              </View>
              <View style={styles.rowSpacer} />
              <View style={styles.flex}>
                <Text style={styles.label}>Bathrooms</Text>
                <RoomStepper
                  label='Bathrooms'
                  value={bathrooms}
                  onChange={(v) => {
                    setBathrooms(v);
                    setHasEdits(true);
                  }}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.label}>Year built</Text>
                <TextInput
                  accessibilityLabel='Year built'
                  style={styles.input}
                  value={yearBuilt}
                  onChangeText={(v) => {
                    setYearBuilt(v);
                    setHasEdits(true);
                  }}
                  placeholder='2005'
                  placeholderTextColor={me.ink3}
                  keyboardType='number-pad'
                />
              </View>
              <View style={styles.rowSpacer} />
              <View style={styles.flex}>
                <Text style={styles.label}>Floor area (optional)</Text>
                <TextInput
                  accessibilityLabel='Floor area'
                  style={styles.input}
                  value={squareFootage}
                  onChangeText={(v) => {
                    setSquareFootage(v);
                    setHasEdits(true);
                  }}
                  placeholder={areaUnit === 'sqm' ? 'm²' : 'sq ft'}
                  placeholderTextColor={me.ink3}
                  keyboardType='decimal-pad'
                />
              </View>
            </View>
            <PropertySegments
              value={areaUnit}
              options={[
                { value: 'sqm', label: 'm²' },
                { value: 'sqft', label: 'sq ft' },
              ]}
              onChange={(next) => {
                if (next === areaUnit) return;
                if (
                  squareFootage.trim() &&
                  !/^\d+(\.\d+)?$/.test(squareFootage.trim())
                ) {
                  Alert.alert(
                    'Check floor area',
                    'Enter a valid area before changing units.'
                  );
                  return;
                }
                if (squareFootage.trim())
                  setSquareFootage(
                    String(
                      next === 'sqm'
                        ? Math.round(
                            (Number(squareFootage) / 10.7639104167) * 100
                          ) / 100
                        : Math.round(Number(squareFootage) * 10.7639104167)
                    )
                  );
                setAreaUnit(next);
              }}
            />
          </View>

          {/* 2026-05-27 audit-74 P1: removed dead Notes section —
              `properties` has no notes column. Access instructions
              are captured on the Access tab. */}

          <TouchableOpacity
            style={ws.row}
            accessibilityRole='button'
            disabled={updateMutation.isPending}
            onPress={() => navigation.goBack()}
          >
            <Text style={[ws.rowText, { textAlign: 'center' }]}>Cancel</Text>
          </TouchableOpacity>
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

function RoomStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const number = /^\d+$/.test(value) ? Number(value) : 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: me.line,
        borderRadius: 12,
        backgroundColor: me.surface,
      }}
    >
      <TouchableOpacity
        accessibilityRole='button'
        accessibilityLabel={'Decrease ' + label.toLowerCase()}
        disabled={number <= 0}
        onPress={() => onChange(String(Math.max(0, number - 1)))}
        style={ws.iconButton}
      >
        <Ionicons
          name='remove'
          size={20}
          color={number <= 0 ? me.ink4 : me.brand2}
        />
      </TouchableOpacity>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType='number-pad'
        placeholder='0'
        style={{
          flex: 1,
          minWidth: 24,
          textAlign: 'center',
          color: me.ink,
          fontWeight: '700',
          fontSize: 18,
        }}
      />
      <TouchableOpacity
        accessibilityRole='button'
        accessibilityLabel={'Increase ' + label.toLowerCase()}
        onPress={() => onChange(String(number + 1))}
        style={ws.iconButton}
      >
        <Ionicons name='add' size={20} color={me.brand2} />
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  screenLabel: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
    backgroundColor: me.bg2,
  },
  screenLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  section: {
    backgroundColor: me.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: me.line,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  inputGroup: { marginBottom: 12 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: me.ink2,
    marginBottom: 4,
  },
  input: {
    backgroundColor: me.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 15,
    color: me.ink,
    borderWidth: 1,
    borderColor: me.line,
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
    backgroundColor: me.bg2,
  },
  typeChipSelected: { backgroundColor: me.ink },
  typeChipText: {
    fontSize: 13,
    color: me.ink2,
    marginLeft: 6,
  },
  typeChipTextSelected: { color: me.onBrand, fontWeight: '600' },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specCard: {
    width: '48%' as unknown as number,
    backgroundColor: me.bg2,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: me.line,
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
    color: me.ink2,
    marginBottom: 6,
  },
  specInput: {
    backgroundColor: me.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
    width: '100%',
    borderWidth: 1,
    borderColor: me.line,
  },
  submitButton: {
    backgroundColor: me.brand2,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: {
    color: me.onBrand,
    fontSize: 17,
    fontWeight: '700',
  },
});
