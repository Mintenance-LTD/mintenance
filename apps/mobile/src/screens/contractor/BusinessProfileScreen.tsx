import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { ScreenHeader, LoadingSpinner } from '../../components/shared';
import { theme } from '../../theme';

interface BusinessProfileResponse {
  profile: {
    company_name: string | null;
    business_address: string | null;
    license_number: string | null;
    license_type: string | null;
    license_expiry: string | null;
    verification_status: string | null;
  } | null;
  insurance: { provider: string | null; policy_number: string | null } | null;
  license: { name: string | null; number: string | null } | null;
}

const LICENSE_TYPES = [
  'General Contractor',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Roofing',
  'Landscaping',
  'Painting',
  'Carpentry',
  'Other',
] as const;

const toProfileLicenseType = (type: string): string | null => {
  const normalized = type
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (!normalized) return null;
  if (normalized === 'general_contractor') return 'trade';
  if (normalized === 'electrical') return 'electrical';
  if (normalized === 'plumbing') return 'plumbing';
  if (normalized === 'hvac') return 'hvac';
  if (normalized === 'roofing') return 'roofing';
  return 'other';
};

const toDisplayLicenseType = (type: string | null | undefined): string => {
  const normalized = toProfileLicenseType(type || '');
  if (!normalized) return '';
  const match = LICENSE_TYPES.find(
    (option) => toProfileLicenseType(option) === normalized
  );
  return match || 'Other';
};

export const BusinessProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [companyName, setCompanyName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');

  // Load existing data via the consolidated business-profile endpoint.
  // Server-side does the joined read; client just hydrates the form.
  const { isLoading } = useQuery({
    queryKey: ['businessProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const data = await mobileApiClient.get<BusinessProfileResponse>(
        '/api/contractor/business-profile'
      );
      const p = data.profile;
      if (p?.company_name) setCompanyName(p.company_name);
      if (p?.business_address) setBusinessAddress(p.business_address);
      if (p?.license_number) setLicenseNumber(p.license_number);
      if (data.insurance?.provider)
        setInsuranceProvider(data.insurance.provider);
      if (data.insurance?.policy_number)
        setPolicyNumber(data.insurance.policy_number);
      if (data.license?.name || p?.license_type) {
        setLicenseType(
          toDisplayLicenseType(data.license?.name || p?.license_type)
        );
      }
      return data;
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not logged in');
      // Single PATCH to /api/contractor/business-profile — the server
      // does the profile update + insurance upsert + license upsert in
      // one place, with the same NOT NULL date defaults the client used
      // to maintain.
      const normalizedLicenseType = toProfileLicenseType(licenseType);
      await mobileApiClient.patch('/api/contractor/business-profile', {
        companyName: companyName.trim(),
        businessAddress: businessAddress.trim(),
        licenseNumber: licenseNumber.trim(),
        licenseType: normalizedLicenseType ?? '',
        ...(insuranceProvider.trim()
          ? {
              insuranceProvider: insuranceProvider.trim(),
              insurancePolicyNumber: policyNumber.trim(),
            }
          : {}),
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['businessProfile'] });
      // Refresh auth user so dashboard greeting picks up new company_name
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['contractorStats'] });
      Alert.alert('Saved', 'Business profile updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  if (isLoading)
    return <LoadingSpinner message='Loading business profile...' />;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.backgroundSecondary}
      />
      <ScreenHeader
        title='Business Profile'
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps='handled'
        >
          {/* Company Info */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>Company Information</Text>
            <Text style={s.label}>Company Name</Text>
            <TextInput
              style={s.input}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder='Your company or trading name'
              placeholderTextColor={theme.colors.textTertiary}
            />
            <Text style={s.label}>Business Address</Text>
            <TextInput
              style={s.input}
              value={businessAddress}
              onChangeText={setBusinessAddress}
              placeholder='Registered business address'
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          {/* License */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>License & Registration</Text>
            <Text style={s.label}>License Number</Text>
            <TextInput
              style={s.input}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder='e.g. LIC-12345'
              placeholderTextColor={theme.colors.textTertiary}
            />
            <Text style={s.label}>License Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.chipScroll}
            >
              {LICENSE_TYPES.map((t) => {
                const isSelected = licenseType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.chip, isSelected && s.chipActive]}
                    onPress={() => setLicenseType(t)}
                    accessibilityRole='button'
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${t}${isSelected ? ', selected' : ''}`}
                  >
                    {isSelected && (
                      <Ionicons
                        name='checkmark'
                        size={14}
                        color={theme.colors.textInverse}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text style={[s.chipText, isSelected && s.chipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {licenseType ? (
              <Text style={s.hintText}>Selected: {licenseType}</Text>
            ) : (
              <Text style={s.hintText}>
                Tap a type that matches your license
              </Text>
            )}
          </View>

          {/* Insurance */}
          <View style={s.insuranceCard}>
            <View style={s.insuranceHeader}>
              <Ionicons
                name='shield-checkmark-outline'
                size={18}
                color='#3B82F6'
              />
              <Text style={s.insuranceTitle}>Insurance Details</Text>
            </View>
            <Text style={s.insuranceSub}>
              Adding insurance builds trust with homeowners
            </Text>
            <Text style={s.label}>Insurance Provider</Text>
            <TextInput
              style={s.input}
              value={insuranceProvider}
              onChangeText={setInsuranceProvider}
              placeholder='e.g. Hiscox, AXA'
              placeholderTextColor={theme.colors.textTertiary}
            />
            <Text style={s.label}>Policy Number</Text>
            <TextInput
              style={s.input}
              value={policyNumber}
              onChangeText={setPolicyNumber}
              placeholder='e.g. POL-123456'
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          <TouchableOpacity
            style={[s.saveBtn, saveMutation.isPending && { opacity: 0.5 }]}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color='#FFF' />
            ) : (
              <>
                <Ionicons name='checkmark-circle' size={20} color='#FFF' />
                <Text style={s.saveBtnText}>Save Business Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = {
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  } as const,
  content: { padding: 16, paddingBottom: 40 } as const,
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  } as const,
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: theme.colors.primary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 4,
  },
  chipScroll: { marginBottom: 8, flexGrow: 0 as const } as const,
  chip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  } as const,
  chipActive: {
    backgroundColor: theme.colors.textPrimary,
    borderColor: theme.colors.textPrimary,
  } as const,
  chipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  chipTextActive: { color: theme.colors.textInverse },
  hintText: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
    marginBottom: 4,
  },
  insuranceCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  } as const,
  insuranceHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  insuranceTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1E40AF',
  },
  insuranceSub: {
    fontSize: 13,
    color: '#3B82F6',
    marginBottom: 10,
    lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 28,
    paddingVertical: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' as const },
};
