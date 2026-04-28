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
        // Single GET — server does the 6 parallel reads previously
        // done client-side. Pre-fill only; missing fields are non-fatal.
        interface PreparationBundle {
          profile: {
            company_name: string | null;
            license_number: string | null;
          } | null;
          insurance: {
            provider: string | null;
            policy_number: string | null;
          } | null;
          license: { name: string | null; number: string | null } | null;
          contract: {
            id: string;
            amount: number | null;
            title: string | null;
            description: string | null;
            terms: string | null;
            status: ContractStatus;
          } | null;
          acceptedBid: {
            amount: number | null;
            description: string | null;
            message: string | null;
          } | null;
          quote: {
            id: string;
            line_items: Array<{
              description: string;
              quantity: number;
              unitPrice: number;
              total: number;
            }> | null;
            total_amount: number | null;
            tax_rate: number | null;
            tax_amount: number | null;
            terms: string | null;
          } | null;
        }
        const data = await mobileApiClient.get<PreparationBundle>(
          `/api/contracts/preparation-data?jobId=${encodeURIComponent(jobId)}`
        );
        if (cancelled) return;

        if (data.profile) {
          if (data.profile.company_name)
            setCompanyName(data.profile.company_name);
          if (data.profile.license_number)
            setLicenseNumber(data.profile.license_number);
        }
        if (data.insurance) {
          if (data.insurance.provider)
            setInsuranceProvider(data.insurance.provider);
          if (data.insurance.policy_number)
            setInsurancePolicyNumber(data.insurance.policy_number);
        }
        if (data.license?.name) setLicenseType(data.license.name);
        if (data.contract) {
          const c = data.contract;
          if (c.amount) setAmount(String(c.amount));
          if (c.title) setTitle(c.title);
          if (c.description) setDescription(c.description);
          if (c.status && c.status !== 'draft')
            setExistingStatus(c.status as ContractStatus);
        }
        if (data.acceptedBid) {
          const b = data.acceptedBid;
          if (b.amount && !amount) setAmount(String(b.amount));
          if ((b.description || b.message) && !description)
            setDescription(b.description || b.message || '');
        }
        if (data.quote) {
          const q = data.quote;
          setQuoteId(q.id);
          if (q.line_items?.length) setQuoteLineItems(q.line_items);
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
    } catch (err: unknown) {
      HapticService.error();
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : typeof err === 'object' && err !== null && 'message' in err
              ? String((err as Record<string, unknown>).message)
              : 'Failed to submit contract. Please try again.';
      Alert.alert('Error', msg);
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
