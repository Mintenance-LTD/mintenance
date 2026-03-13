/**
 * ContractPreparationScreen - Contractor fills in contract terms (Phase 4.5)
 *
 * After bid acceptance, the contract is auto-created as 'draft'.
 * The web API blocks signing 'draft' contracts.
 * This screen lets contractors fill in terms, dates, license info
 * to move the contract to 'pending_homeowner' via POST /api/contracts.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { HapticService } from '../../utils/haptics';
import { JobsStackParamList } from '../../navigation/types';

type ScreenRouteProp = RouteProp<JobsStackParamList, 'ContractPreparation'>;
type ScreenNavigationProp = NativeStackNavigationProp<JobsStackParamList, 'ContractPreparation'>;

interface Props {
  route: ScreenRouteProp;
  navigation: ScreenNavigationProp;
}

interface ContractDraft {
  id?: string;
  amount?: number;
  title?: string;
  description?: string;
}

export const ContractPreparationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, jobTitle } = route.params;
  const insets = useSafeAreaInsets();

  // Form state
  const [title, setTitle] = useState(jobTitle ? `Contract for ${jobTitle}` : '');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [licenseRegistration, setLicenseRegistration] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [terms, setTerms] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const [verificationRes, profileRes, contractsRes] = await Promise.allSettled([
          mobileApiClient.get<{ verification?: { company_name?: string; license_number?: string } }>('/api/contractor/verification'),
          mobileApiClient.get<{ profile?: { insurance_provider?: string; insurance_policy_number?: string } }>('/api/contractor/profile-data'),
          mobileApiClient.get<{ contracts?: ContractDraft[] }>(`/api/contracts?job_id=${jobId}`),
        ]);

        if (cancelled) return;

        if (verificationRes.status === 'fulfilled' && verificationRes.value?.verification) {
          const v = verificationRes.value.verification;
          if (v.company_name) setCompanyName(v.company_name);
          if (v.license_number) setLicenseRegistration(v.license_number);
        }

        if (profileRes.status === 'fulfilled' && profileRes.value?.profile) {
          const p = profileRes.value.profile;
          if (p.insurance_provider) setInsuranceProvider(p.insurance_provider);
          if (p.insurance_policy_number) setInsurancePolicyNumber(p.insurance_policy_number);
        }

        if (contractsRes.status === 'fulfilled' && contractsRes.value?.contracts?.[0]) {
          const c = contractsRes.value.contracts[0];
          if (c.amount) setAmount(String(c.amount));
          if (c.title) setTitle(c.title);
          if (c.description) setDescription(c.description);
        }
      } catch {
        // Non-critical - form still works without pre-fill
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [jobId, jobTitle]);

  const validate = useCallback((): string | null => {
    if (!title || title.length < 2) return 'Title must be at least 2 characters';
    if (!description || description.length < 10) return 'Description must be at least 10 characters';
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return 'Enter a valid amount';
    if (!startDate) return 'Start date is required';
    if (!endDate) return 'End date is required';
    if (new Date(endDate) <= new Date(startDate)) return 'End date must be after start date';
    if (!companyName) return 'Company name is required';
    if (!licenseRegistration) return 'License/registration number is required';
    return null;
  }, [title, description, amount, startDate, endDate, companyName, licenseRegistration]);

  const handleSubmit = useCallback(async () => {
    const error = validate();
    if (error) {
      Alert.alert('Missing Information', error);
      return;
    }

    setSubmitting(true);
    try {
      const termsObj: Record<string, string> = {};
      if (terms.trim()) termsObj.additional_terms = terms.trim();
      if (insuranceProvider) termsObj.insurance_provider = insuranceProvider;
      if (insurancePolicyNumber) termsObj.insurance_policy_number = insurancePolicyNumber;

      await mobileApiClient.post('/api/contracts', {
        job_id: jobId,
        title,
        description,
        amount: Number(amount),
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        contractor_company_name: companyName,
        contractor_license_registration: licenseRegistration,
        contractor_license_type: licenseType || undefined,
        terms: termsObj,
      });

      HapticService.success();
      Alert.alert(
        'Contract Submitted',
        'The homeowner has been notified to review and sign the contract.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      HapticService.error();
      const msg = err instanceof Error ? err.message : 'Failed to submit contract';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }, [jobId, title, description, amount, startDate, endDate, companyName, licenseRegistration, licenseType, insuranceProvider, insurancePolicyNumber, terms, validate, navigation]);

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#222222" />
        <Text style={styles.loadingText}>Loading contract details...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color="#222222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prepare Contract</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="document-text-outline" size={20} color="#222222" />
            <Text style={styles.infoText}>Fill in the contract details for the homeowner to review and sign.</Text>
          </View>

          {/* Contract Details */}
          <Text style={styles.sectionLabel}>Contract Details</Text>

          <Text style={styles.fieldLabel}>Title *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g., Kitchen Plumbing Repair Contract" placeholderTextColor="#B0B0B0" />

          <Text style={styles.fieldLabel}>Description *</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Describe the scope of work..." placeholderTextColor="#B0B0B0" multiline numberOfLines={4} textAlignVertical="top" />

          <Text style={styles.fieldLabel}>Amount ({'\u00A3'}) *</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#B0B0B0" keyboardType="decimal-pad" />

          {/* Schedule */}
          <Text style={styles.sectionLabel}>Schedule</Text>

          <Text style={styles.fieldLabel}>Start Date *</Text>
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor="#B0B0B0" />

          <Text style={styles.fieldLabel}>End Date *</Text>
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor="#B0B0B0" />

          {/* Business Details */}
          <Text style={styles.sectionLabel}>Business Details</Text>

          <Text style={styles.fieldLabel}>Company Name *</Text>
          <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder="Your company name" placeholderTextColor="#B0B0B0" />

          <Text style={styles.fieldLabel}>License / Registration Number *</Text>
          <TextInput style={styles.input} value={licenseRegistration} onChangeText={setLicenseRegistration} placeholder="License or registration number" placeholderTextColor="#B0B0B0" />

          <Text style={styles.fieldLabel}>License Type (optional)</Text>
          <TextInput style={styles.input} value={licenseType} onChangeText={setLicenseType} placeholder="e.g., General, Electrical, Plumbing" placeholderTextColor="#B0B0B0" />

          <Text style={styles.fieldLabel}>Insurance Provider (optional)</Text>
          <TextInput style={styles.input} value={insuranceProvider} onChangeText={setInsuranceProvider} placeholder="Insurance company name" placeholderTextColor="#B0B0B0" />

          <Text style={styles.fieldLabel}>Insurance Policy Number (optional)</Text>
          <TextInput style={styles.input} value={insurancePolicyNumber} onChangeText={setInsurancePolicyNumber} placeholder="Policy number" placeholderTextColor="#B0B0B0" />

          {/* Additional Terms */}
          <Text style={styles.sectionLabel}>Additional Terms</Text>

          <TextInput style={[styles.input, styles.textArea]} value={terms} onChangeText={setTerms} placeholder="Any additional terms or conditions..." placeholderTextColor="#B0B0B0" multiline numberOfLines={3} textAlignVertical="top" />

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Submit contract"
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="document-text" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Contract</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F7F7F7' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#717171' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEBEB', backgroundColor: '#FFFFFF' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F7F7F7', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#222222', textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  infoBanner: { flexDirection: 'row', backgroundColor: '#D1FAE5', borderRadius: 16, padding: 14, gap: 10, marginBottom: 24, alignItems: 'center' },
  infoText: { flex: 1, fontSize: 14, color: '#222222', lineHeight: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#B0B0B0', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#717171', marginBottom: 6 },
  input: { backgroundColor: '#F7F7F7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#222222', marginBottom: 14 },
  textArea: { minHeight: 90, paddingTop: 12 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EBEBEB', ...Platform.select({ ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 8 } }) },
  submitButton: { backgroundColor: '#222222', borderRadius: 28, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default ContractPreparationScreen;
