import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  Switch,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { JobService } from '../services/JobService';
import { useAuth } from '../contexts/AuthContext';
import { Job } from '@mintenance/types';
import { JobsStackParamList } from '../navigation/types';
import { logger } from '../utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DatePicker } from '../components/ui/DatePicker';
import { QuoteItemsList } from './create-quote/components/QuoteItemsList';
import { PricingSummary } from './create-quote/components/PricingSummary';
import type { LineItem } from './create-quote/viewmodels/CreateQuoteViewModel';
import { me } from '../design-system/mint-editorial';
import { styles } from './BidSubmissionStyles';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { JobRoomScope } from './components/JobRoomScope';

type Props = {
  route: RouteProp<JobsStackParamList, 'BidSubmission'>;
  navigation: NativeStackNavigationProp<JobsStackParamList, 'BidSubmission'>;
};

const PLATFORM_FEE_PERCENT = 5;
const MIN_DESC = 50;
const MAX_DESC = 5000;
const VAT_RATE = 20;

const BidSubmissionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [mode, setMode] = useState<'quick' | 'detailed'>('quick');

  // Quick bid fields
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [proposedStartDate, setProposedStartDate] = useState<Date | null>(null);

  // Detailed quote fields
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [includeVAT, setIncludeVAT] = useState(true);
  const [terms, setTerms] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Discard-prompt protection — bail-out without saving loses the
  // entire bid draft, which is high-effort content. The prompt covers
  // both quick + detailed modes by checking every input source.
  const isDirty = !!(
    amount ||
    description ||
    estimatedDuration ||
    proposedStartDate ||
    terms ||
    lineItems.length > 0
  );
  const allowExit = useUnsavedChanges(isDirty);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      setJob(await JobService.getJobById(jobId));
    } catch {
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const subtotal =
    mode === 'detailed'
      ? lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
      : parseFloat(amount) || 0;
  const taxRate = includeVAT ? VAT_RATE : 0;
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;
  const platformFee = totalAmount * (PLATFORM_FEE_PERCENT / 100);
  const yourEarnings = totalAmount - platformFee;
  const bidAmount = mode === 'detailed' ? totalAmount : parseFloat(amount) || 0;
  const isOverBudget = job?.budget != null && bidAmount > job.budget;
  const descShort =
    description.trim().length > 0 && description.trim().length < MIN_DESC;

  const isValid =
    bidAmount > 0 &&
    description.trim().length >= MIN_DESC &&
    estimatedDuration.trim().length > 0 &&
    parseInt(estimatedDuration, 10) > 0 &&
    proposedStartDate !== null &&
    (mode === 'quick' || lineItems.length > 0);

  // Line item actions
  const addLineItem = () => {
    Alert.prompt
      ? Alert.prompt('Line Item', 'Description:', (desc) => {
          if (!desc?.trim()) return;
          setLineItems((prev) => [
            ...prev,
            {
              item_name: desc.trim(),
              item_description: '',
              quantity: 1,
              unit_price: 0,
              unit: 'unit',
              category: 'labour',
              is_taxable: true,
              sort_order: prev.length,
            },
          ]);
        })
      : setLineItems((prev) => [
          ...prev,
          {
            item_name: `Item ${prev.length + 1}`,
            item_description: '',
            quantity: 1,
            unit_price: 0,
            unit: 'unit',
            category: 'labour',
            is_taxable: true,
            sort_order: prev.length,
          },
        ]);
  };
  const removeLineItem = (index: number) =>
    setLineItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    setFormError(null);
    if (!user || user.role !== 'contractor') {
      setFormError('Only contractors can submit bids');
      return;
    }
    if (bidAmount <= 0) {
      setFormError('Please enter a valid bid amount');
      return;
    }
    if (description.trim().length < MIN_DESC) {
      setFormError(`Proposal must be at least ${MIN_DESC} characters`);
      return;
    }
    if (!estimatedDuration || parseInt(estimatedDuration, 10) <= 0) {
      setFormError('Please enter an estimated duration');
      return;
    }
    if (!proposedStartDate) {
      setFormError('Please select a proposed start date');
      return;
    }
    if (mode === 'detailed' && lineItems.length === 0) {
      setFormError('Add at least one line item');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        jobId,
        contractorId: user.id,
        amount: bidAmount,
        description: description.trim(),
        estimatedDurationDays: parseInt(estimatedDuration, 10),
        proposedStartDate: proposedStartDate.toISOString().split('T')[0],
      };
      if (mode === 'detailed') {
        payload.lineItems = lineItems.map((i) => ({
          description: i.item_name,
          type: i.category === 'materials' ? 'material' : 'labor',
          quantity: i.quantity,
          unitPrice: i.unit_price,
          total: i.quantity * i.unit_price,
        }));
        payload.subtotal = subtotal;
        payload.taxRate = taxRate;
        payload.taxAmount = taxAmount;
        payload.totalAmount = totalAmount;
        if (terms.trim()) payload.terms = terms.trim();
      }
      await JobService.submitBid(
        payload as Parameters<typeof JobService.submitBid>[0]
      );
      Alert.alert('Success', 'Your bid has been submitted!', [
        {
          text: 'OK',
          onPress: () => {
            allowExit();
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Failed to submit bid'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !job) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: me.ink2 }}>
          {loading ? 'Loading...' : 'Job not found'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons name='arrow-back' size={22} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'quick' ? 'Submit Bid' : 'Submit Quote'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
        >
          {/* Job info */}
          <View style={styles.jobCard}>
            <View style={styles.jobIconWrap}>
              <Ionicons name='briefcase-outline' size={22} color='#3B82F6' />
            </View>
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobDescription} numberOfLines={2}>
                {job.description}
              </Text>
              {job.budget != null && (
                <View style={styles.budgetBadge}>
                  <Text style={styles.budgetText}>
                    Budget: {'\u00A3'}
                    {job.budget.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Property Rooms Slice 1 \u2014 rooms-in-scope panel.
              Renders only when the job has a room snapshot; legacy
              jobs (no snapshot) get nothing here, preserving the
              original look. */}
          <JobRoomScope jobId={jobId} />

          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'quick' && styles.modeBtnActive]}
              onPress={() => setMode('quick')}
              accessibilityRole='tab'
              accessibilityLabel='Quick Bid'
              accessibilityState={{ selected: mode === 'quick' }}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  mode === 'quick' && styles.modeBtnTextActive,
                ]}
              >
                Quick Bid
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                mode === 'detailed' && styles.modeBtnActive,
              ]}
              onPress={() => setMode('detailed')}
              accessibilityRole='tab'
              accessibilityLabel='Detailed Quote'
              accessibilityState={{ selected: mode === 'detailed' }}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  mode === 'detailed' && styles.modeBtnTextActive,
                ]}
              >
                Detailed Quote
              </Text>
            </TouchableOpacity>
          </View>

          {/* QUICK MODE: amount field */}
          {mode === 'quick' && (
            <View style={styles.formCard}>
              <Text style={styles.sectionLabel}>Pricing</Text>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Your Bid Amount *</Text>
                <View style={styles.currencyRow}>
                  <View style={styles.currencyPrefix}>
                    <Text style={styles.currencySymbol}>{'\u00A3'}</Text>
                  </View>
                  <TextInput
                    style={styles.currencyInput}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder='e.g. 250'
                    placeholderTextColor={me.ink3}
                    keyboardType='decimal-pad'
                    accessibilityLabel='Bid amount in pounds'
                  />
                </View>
              </View>
              {isOverBudget && (
                <View style={styles.warningBanner}>
                  <Ionicons name='alert-circle' size={16} color='#DC2626' />
                  <Text style={styles.warningText}>
                    Bid exceeds budget by {'\u00A3'}
                    {(bidAmount - (job.budget || 0)).toLocaleString()}
                  </Text>
                </View>
              )}
              {bidAmount > 0 && (
                <View style={styles.earningsCard}>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabel}>Your bid</Text>
                    <Text style={styles.earningsValue}>
                      {'\u00A3'}
                      {bidAmount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabel}>
                      Platform fee ({PLATFORM_FEE_PERCENT}%)
                    </Text>
                    <Text style={[styles.earningsValue, { color: me.errFg }]}>
                      -{'\u00A3'}
                      {platformFee.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.earningsDivider} />
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsTotalLabel}>You earn</Text>
                    <Text style={styles.earningsTotalValue}>
                      {'\u00A3'}
                      {yourEarnings.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* DETAILED MODE: line items + pricing */}
          {mode === 'detailed' && (
            <>
              <QuoteItemsList
                lineItems={lineItems}
                onAddItem={addLineItem}
                onEditItem={() => {}}
                onRemoveItem={removeLineItem}
              />
              <View style={styles.formCard}>
                <View style={styles.vatRow}>
                  <Text style={styles.vatLabel}>Include VAT (20%)</Text>
                  <Switch
                    value={includeVAT}
                    onValueChange={setIncludeVAT}
                    trackColor={{
                      false: me.line,
                      true: me.brand,
                    }}
                    thumbColor='#FFF'
                    accessibilityRole='switch'
                    accessibilityLabel='Include VAT at 20 percent'
                    accessibilityState={{ checked: includeVAT }}
                  />
                </View>
              </View>
              <PricingSummary
                subtotal={subtotal}
                markupPercentage='0'
                discountAmount={0}
                discountPercentage='0'
                taxAmount={taxAmount}
                taxRate={String(taxRate)}
                totalAmount={totalAmount}
              />
              {isOverBudget && (
                <View style={styles.warningBanner}>
                  <Ionicons name='alert-circle' size={16} color='#DC2626' />
                  <Text style={styles.warningText}>
                    Quote exceeds budget by {'\u00A3'}
                    {(totalAmount - (job.budget || 0)).toLocaleString()}
                  </Text>
                </View>
              )}
              {totalAmount > 0 && (
                <View style={styles.earningsCard}>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabel}>Quote total</Text>
                    <Text style={styles.earningsValue}>
                      {'\u00A3'}
                      {totalAmount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsLabel}>
                      Platform fee ({PLATFORM_FEE_PERCENT}%)
                    </Text>
                    <Text style={[styles.earningsValue, { color: me.errFg }]}>
                      -{'\u00A3'}
                      {platformFee.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.earningsDivider} />
                  <View style={styles.earningsRow}>
                    <Text style={styles.earningsTotalLabel}>You earn</Text>
                    <Text style={styles.earningsTotalValue}>
                      {'\u00A3'}
                      {yourEarnings.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Common fields: proposal, duration, start date */}
          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>Proposal</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Proposal Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your approach, timeline, and why you're the right contractor..."
                placeholderTextColor={me.ink3}
                multiline
                numberOfLines={6}
                textAlignVertical='top'
                maxLength={MAX_DESC}
                accessibilityLabel='Proposal description'
              />
              <View style={styles.charCountRow}>
                <Text
                  style={[styles.charCount, descShort && styles.charCountError]}
                >
                  {description.length}/{MAX_DESC}
                  {descShort ? ` (min ${MIN_DESC})` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.fieldGroup, styles.flex]}>
                <Text style={styles.label}>Duration (days) *</Text>
                <TextInput
                  style={styles.input}
                  value={estimatedDuration}
                  onChangeText={setEstimatedDuration}
                  placeholder='e.g. 3'
                  placeholderTextColor={me.ink3}
                  keyboardType='number-pad'
                  accessibilityLabel='Estimated duration in days'
                />
              </View>
              <View style={styles.rowSpacer} />
              <View style={[styles.fieldGroup, styles.flex]}>
                <Text style={styles.label}>Start Date *</Text>
                <DatePicker
                  label='Select date'
                  value={proposedStartDate}
                  onChange={setProposedStartDate}
                  minimumDate={new Date()}
                />
              </View>
            </View>
          </View>

          {/* Terms (detailed mode) */}
          {mode === 'detailed' && (
            <View style={styles.formCard}>
              <Text style={styles.sectionLabel}>Terms & Conditions</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                value={terms}
                onChangeText={setTerms}
                placeholder='Any terms, warranty info, or conditions...'
                placeholderTextColor={me.ink3}
                multiline
                numberOfLines={3}
                textAlignVertical='top'
                accessibilityLabel='Terms and conditions'
              />
            </View>
          )}

          {/* Tips */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name='bulb' size={16} color='#FBBF24' />
              <Text style={styles.tipsTitle}>Pro Tips</Text>
            </View>
            <Text style={styles.tipItem}>
              {'\u2022'} Be competitive but fair with your pricing
            </Text>
            <Text style={styles.tipItem}>
              {'\u2022'}{' '}
              {mode === 'detailed'
                ? 'Break down costs so homeowners see the value'
                : 'Switch to Detailed Quote for an itemised breakdown'}
            </Text>
            <Text style={styles.tipItem}>
              {'\u2022'} Mention relevant experience or certifications
            </Text>
          </View>

          {formError && (
            <View style={styles.errorBanner}>
              <Ionicons name='alert-circle' size={16} color='#DC2626' />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isValid || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          accessibilityRole='button'
          accessibilityLabel='Submit bid'
          accessibilityState={{ disabled: !isValid || submitting }}
        >
          <Ionicons name='send-outline' size={18} color={me.onBrand} />
          <Text style={styles.submitButtonText}>
            {submitting
              ? 'Submitting...'
              : mode === 'quick'
                ? 'Submit Bid'
                : 'Submit Quote'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BidSubmissionScreen;
