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
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { HapticService } from '../../utils/haptics';
import { JobsStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

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
  const { user } = useAuth();

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
        if (!user?.id) return;

        const [verificationRes, profileRes, contractsRes] = await Promise.allSettled([
          supabase.from('contractor_verifications').select('company_name, license_number').eq('contractor_id', user.id).single(),
          supabase.from('contractor_profiles').select('insurance_provider, insurance_policy_number').eq('user_id', user.id).single(),
          supabase.from('contracts').select('id, amount, title, description').eq('job_id', jobId).limit(1),
        ]);

        if (cancelled) return;

        if (verificationRes.status === 'fulfilled' && verificationRes.value?.data) {
          const v = verificationRes.value.data as Record<string, unknown>;
          if (v.company_name) setCompanyName(v.company_name as string);
          if (v.license_number) setLicenseRegistration(v.license_number as string);
        }

        if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
          const p = profileRes.value.data as Record<string, unknown>;
          if (p.insurance_provider) setInsuranceProvider(p.insurance_provider as string);
          if (p.insurance_policy_number) setInsurancePolicyNumber(p.insurance_policy_number as string);
        }

        if (contractsRes.status === 'fulfilled' && contractsRes.value?.data?.[0]) {
          const c = contractsRes.value.data[0] as Record<string, unknown>;
          if (c.amount) setAmount(String(c.amount));
          if (c.title) setTitle(c.title as string);
          if (c.description) setDescription(c.description as string);
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
        <ActivityIndicator size="large" color={theme.colors.textPrimary} />
        <Text style={styles.loadingText}>Loading contract details...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prepare Contract</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="document-text-outline" size={20} color={theme.colors.textPrimary} />
            <Text style={styles.infoText}>Fill in the contract details for the homeowner to review and sign.</Text>
          </View>

          {/* Contract Details */}
          <Text style={styles.sectionLabel}>Contract Details</Text>

          <Text style={styles.fieldLabel}>Title *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g., Kitchen Plumbing Repair Contract" placeholderTextColor={theme.colors.textTertiary} />

          <Text style={styles.fieldLabel}>Description *</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Describe the scope of work..." placeholderTextColor={theme.colors.textTertiary} multiline numberOfLines={4} textAlignVertical="top" />

          <Text style={styles.fieldLabel}>Amount ({'\u00A3'}) *</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={theme.colors.textTertiary} keyboardType="decimal-pad" />

          {/* Schedule */}
          <Text style={styles.sectionLabel}>Schedule</Text>

          <Text style={styles.fieldLabel}>Start Date *</Text>
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textTertiary} />

          <Text style={styles.fieldLabel}>End Date *</Text>
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textTertiary} />

          {/* Business Details */}
          <Text style={styles.sectionLabel}>Business Details</Text>

          <Text style={styles.fieldLabel}>Company Name *</Text>
          <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder="Your company name" placeholderTextColor={theme.colors.textTertiary} />

          <Text style={styles.fieldLabel}>License / Registration Number *</Text>
          <TextInput style={styles.input} value={licenseRegistration} onChangeText={setLicenseRegistration} placeholder="License or registration number" placeholderTextColor={theme.colors.textTertiary} />

          <Text style={styles.fieldLabel}>License Type (optional)</Text>
          <TextInput style={styles.input} value={licenseType} onChangeText={setLicenseType} placeholder="e.g., General, Electrical, Plumbing" placeholderTextColor={theme.colors.textTertiary} />

          <Text style={styles.fieldLabel}>Insurance Provider (optional)</Text>
          <TextInput style={styles.input} value={insuranceProvider} onChangeText={setInsuranceProvider} placeholder="Insurance company name" placeholderTextColor={theme.colors.textTertiary} />

          <Text style={styles.fieldLabel}>Insurance Policy Number (optional)</Text>
          <TextInput style={styles.input} value={insurancePolicyNumber} onChangeText={setInsurancePolicyNumber} placeholder="Policy number" placeholderTextColor={theme.colors.textTertiary} />

          {/* Additional Terms */}
          <Text style={styles.sectionLabel}>Additional Terms</Text>

          <TextInput style={[styles.input, styles.textArea]} value={terms} onChangeText={setTerms} placeholder="Any additional terms or conditions..." placeholderTextColor={theme.colors.textTertiary} multiline numberOfLines={3} textAlignVertical="top" />

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
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <>
              <Ionicons name="document-text" size={20} color={theme.colors.textInverse} />
              <Text style={styles.submitButtonText}>Submit Contract</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.colors.backgroundSecondary },
  loadingText: { marginTop: 12, fontSize: 16, color: theme.colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  infoBanner: { flexDirection: 'row', backgroundColor: theme.colors.primaryLight, borderRadius: 16, padding: 14, gap: 10, marginBottom: 24, alignItems: 'center' },
  infoText: { flex: 1, fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: theme.colors.backgroundSecondary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary, marginBottom: 14 },
  textArea: { minHeight: 90, paddingTop: 12 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.colors.surface, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, ...Platform.select({ ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 8 } }) },
  submitButton: { backgroundColor: theme.colors.textPrimary, borderRadius: 28, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: theme.colors.textInverse, fontSize: 16, fontWeight: '600' },
});

export default ContractPreparationScreen;
