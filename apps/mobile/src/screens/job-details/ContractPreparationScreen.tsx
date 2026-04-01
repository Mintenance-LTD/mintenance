import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import { useAuth } from '../../contexts/AuthContext';
import { HapticService } from '../../utils/haptics';
import { JobsStackParamList } from '../../navigation/types';
import { theme } from '../../theme';
import { styles } from './ContractPreparationStyles';
import {
  AgreedQuoteCard,
  LicenseTypeChips,
  InsuranceDetailsCard,
  DateRangePicker,
} from './ContractFormSections';

type Props = {
  route: RouteProp<JobsStackParamList, 'ContractPreparation'>;
  navigation: NativeStackNavigationProp<
    JobsStackParamList,
    'ContractPreparation'
  >;
};

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

type ContractStatus =
  | 'draft'
  | 'pending_homeowner'
  | 'pending_contractor'
  | 'accepted'
  | 'rejected'
  | null;

export const ContractPreparationScreen: React.FC<Props> = ({
  route,
  navigation,
}) => {
  const { jobId, jobTitle } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState(
    jobTitle ? `Contract for ${jobTitle}` : ''
  );
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [terms, setTerms] = useState('');

  // Quote data (from accepted bid)
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [quoteLineItems, setQuoteLineItems] = useState<
    Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>
  >([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingStatus, setExistingStatus] = useState<ContractStatus>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        if (!user?.id) return;
        const { supabase } = await import('../../config/supabase');
        const [profileRes, contractsRes, bidRes, quoteRes] =
          await Promise.allSettled([
            supabase
              .from('contractor_profiles')
              .select(
                'company_name, license_number, license_type, insurance_provider, insurance_policy_number'
              )
              .eq('user_id', user.id)
              .single(),
            supabase
              .from('contracts')
              .select('id, amount, title, description, terms, status')
              .eq('job_id', jobId)
              .order('created_at', { ascending: false })
              .limit(1),
            supabase
              .from('bids')
              .select('amount, description, message')
              .eq('job_id', jobId)
              .eq('contractor_id', user.id)
              .eq('status', 'accepted')
              .limit(1)
              .maybeSingle(),
            supabase
              .from('contractor_quotes')
              .select(
                'id, line_items, total_amount, tax_rate, tax_amount, terms'
              )
              .eq('job_id', jobId)
              .eq('contractor_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);
        if (cancelled) return;

        if (profileRes.status === 'fulfilled' && profileRes.value.data) {
          const p = profileRes.value.data;
          if (p.company_name) setCompanyName(p.company_name);
          if (p.license_number) setLicenseNumber(p.license_number);
          if (p.license_type) setLicenseType(p.license_type);
          if (p.insurance_provider) setInsuranceProvider(p.insurance_provider);
          if (p.insurance_policy_number)
            setInsurancePolicyNumber(p.insurance_policy_number);
        }
        if (
          contractsRes.status === 'fulfilled' &&
          contractsRes.value.data?.[0]
        ) {
          const c = contractsRes.value.data[0];
          if (c.amount) setAmount(String(c.amount));
          if (c.title) setTitle(c.title);
          if (c.description) setDescription(c.description);
          if (c.status && c.status !== 'draft')
            setExistingStatus(c.status as ContractStatus);
        }
        if (bidRes.status === 'fulfilled' && bidRes.value.data) {
          const b = bidRes.value.data;
          if (b.amount && !amount) setAmount(String(b.amount));
          if ((b.description || b.message) && !description)
            setDescription(b.description || b.message || '');
        }
        // Load linked quote (line items from accepted bid)
        if (quoteRes.status === 'fulfilled' && quoteRes.value.data) {
          const q = quoteRes.value.data;
          setQuoteId(q.id);
          const items = q.line_items as Array<{
            description: string;
            quantity: number;
            unitPrice: number;
            total: number;
          }> | null;
          if (items?.length) setQuoteLineItems(items);
          if (q.terms && !terms) setTerms(String(q.terms));
        }
      } catch {
        /* pre-fill is non-critical */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, [jobId, jobTitle]);

  const validate = useCallback((): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!title || title.length < 2)
      e.title = 'Title must be at least 2 characters';
    if (!description || description.length < 10)
      e.description = 'Description must be at least 10 characters';
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      e.amount = 'Enter a valid amount';
    if (!startDate) e.startDate = 'Start date is required';
    if (!endDate) e.endDate = 'End date is required';
    if (startDate && endDate && endDate <= startDate)
      e.endDate = 'End date must be after start date';
    if (!companyName) e.companyName = 'Company name is required';
    if (!licenseNumber) e.licenseNumber = 'License number is required';
    return e;
  }, [
    title,
    description,
    amount,
    startDate,
    endDate,
    companyName,
    licenseNumber,
  ]);

  const handleSubmit = useCallback(async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      HapticService.error();
      return;
    }

    setSubmitting(true);
    try {
      await mobileApiClient.post('/api/contracts', {
        job_id: jobId,
        title,
        description,
        amount: Number(amount),
        start_date: startDate!.toISOString(),
        end_date: endDate!.toISOString(),
        contractor_company_name: companyName,
        contractor_license_registration: licenseNumber,
        contractor_license_type: licenseType || undefined,
        insurance_provider: insuranceProvider || undefined,
        insurance_policy_number: insurancePolicyNumber || undefined,
        terms: terms.trim() || undefined,
        quote_id: quoteId || undefined,
      });
      HapticService.success();
      Alert.alert(
        'Contract Sent',
        'The homeowner has been notified to review and sign.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      HapticService.error();
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to submit contract'
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    jobId,
    title,
    description,
    amount,
    startDate,
    endDate,
    companyName,
    licenseNumber,
    licenseType,
    insuranceProvider,
    insurancePolicyNumber,
    terms,
    validate,
    navigation,
  ]);

  const formatDate = (d: Date | null) =>
    d
      ? d.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
  const isSigned = existingStatus === 'accepted';

  const statusBanner = () => {
    if (!existingStatus) return null;
    const cfg =
      existingStatus === 'accepted'
        ? {
            bg: '#D1FAE5',
            border: '#A7F3D0',
            icon: 'checkmark-circle' as const,
            color: '#065F46',
            text: 'Contract signed by both parties.',
          }
        : existingStatus === 'rejected'
          ? {
              bg: '#FEE2E2',
              border: '#FECACA',
              icon: 'alert-circle' as const,
              color: '#991B1B',
              text: 'Homeowner requested changes. Update and resend.',
            }
          : {
              bg: '#DBEAFE',
              border: '#93C5FD',
              icon: 'information-circle' as const,
              color: '#1E40AF',
              text: `Contract already sent (status: ${existingStatus.replace(/_/g, ' ')}).`,
            };
    return (
      <View
        style={[
          styles.statusBanner,
          { backgroundColor: cfg.bg, borderColor: cfg.border },
        ]}
      >
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        <Text style={[styles.statusText, { color: cfg.color }]}>
          {cfg.text}
        </Text>
      </View>
    );
  };

  const FErr = ({ f }: { f: string }) =>
    errors[f] ? <Text style={styles.fieldError}>{errors[f]}</Text> : null;
  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size='large' color={theme.colors.textPrimary} />
        <Text style={styles.loadingText}>Loading contract details...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.surface}
      />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name='arrow-back'
            size={22}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prepare Contract</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps='handled'
        >
          <View style={styles.infoBanner}>
            <Ionicons
              name='document-text-outline'
              size={20}
              color={theme.colors.textPrimary}
            />
            <Text style={styles.infoText}>
              Fill in the contract details. This will be sent to the homeowner
              for review and signature.
            </Text>
          </View>

          {statusBanner()}

          <AgreedQuoteCard items={quoteLineItems} amount={amount} />
          <Text style={styles.sectionLabel}>Scope of Work</Text>
          <Text style={styles.fieldLabel}>Contract Title *</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            value={title}
            onChangeText={setTitle}
            placeholder='e.g., Kitchen Plumbing Repair'
            placeholderTextColor={theme.colors.textTertiary}
          />
          <FErr f='title' />

          <Text style={styles.fieldLabel}>Description of Work *</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              errors.description && styles.inputError,
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder='Describe the work to be performed in detail...'
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical='top'
          />
          <FErr f='description' />

          <Text style={styles.sectionLabel}>Payment & Schedule</Text>
          <Text style={styles.fieldLabel}>Contract Amount ({'\u00A3'}) *</Text>
          <TextInput
            style={[styles.input, errors.amount && styles.inputError]}
            value={amount}
            onChangeText={setAmount}
            placeholder='0.00'
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType='decimal-pad'
          />
          <Text style={styles.escrowNote}>
            Payment will be held securely in escrow via Mintenance
          </Text>
          <FErr f='amount' />

          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
            startError={errors.startDate}
            endError={errors.endDate}
            formatDate={formatDate}
          />

          {/* BUSINESS DETAILS */}
          <Text style={styles.sectionLabel}>Business Details</Text>
          <Text style={styles.fieldLabel}>Company Name *</Text>
          <TextInput
            style={[styles.input, errors.companyName && styles.inputError]}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder='Your company name'
            placeholderTextColor={theme.colors.textTertiary}
          />
          <FErr f='companyName' />

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>License Number *</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.licenseNumber && styles.inputError,
                ]}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder='e.g. LIC-12345'
                placeholderTextColor={theme.colors.textTertiary}
              />
              <FErr f='licenseNumber' />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>License Type</Text>
              <LicenseTypeChips
                selected={licenseType}
                onSelect={setLicenseType}
                types={LICENSE_TYPES}
              />
            </View>
          </View>

          <InsuranceDetailsCard
            provider={insuranceProvider}
            setProvider={setInsuranceProvider}
            policyNumber={insurancePolicyNumber}
            setPolicyNumber={setInsurancePolicyNumber}
          />

          {/* ADDITIONAL TERMS */}
          <Text style={styles.sectionLabel}>Additional Terms</Text>
          <Text style={styles.fieldLabel}>Terms & Conditions (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={terms}
            onChangeText={setTerms}
            placeholder='Any additional terms, conditions, or special requirements...'
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical='top'
          />

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (submitting || isSigned) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || isSigned}
          >
            {submitting ? (
              <ActivityIndicator color='#FFF' />
            ) : (
              <>
                <Ionicons name='document-text' size={18} color='#FFF' />
                <Text style={styles.submitText}>
                  {isSigned
                    ? 'Contract Signed'
                    : existingStatus
                      ? 'Update & Resend'
                      : 'Send Contract to Homeowner'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ContractPreparationScreen;
