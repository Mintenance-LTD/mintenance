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
import { BidService } from '../services/BidService';
import { mobileApiClient } from '../utils/mobileApiClient';
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
import { supabase } from '../config/supabase';
import type { JobRoomScopeOption } from './create-quote/components/LineItemScopeToolbar';

type Props = {
  route: RouteProp<JobsStackParamList, 'BidSubmission'>;
  navigation: NativeStackNavigationProp<JobsStackParamList, 'BidSubmission'>;
};

const PLATFORM_FEE_PERCENT = 5;
const MIN_DESC = 50;
const MAX_DESC = 5000;
const VAT_RATE = 20;

const BidSubmissionScreen: React.FC<Props> = ({ route, navigation }) => {
  // 2026-05-27 audit-73 P3: defensive guard against malformed
  // navigation params (deep link missing jobId, notification routing
  // fallback into BidSubmission, an error-boundary retry that loses
  // params). JobDetailsScreen got this same hardening in audit-58
  // P3 #248 — without it, destructuring `route.params.jobId` on an
  // undefined `params` throws before we can render a controlled
  // error state. Render an inline error card + back CTA instead of
  // crashing into the JS exception boundary.
  const params = route.params as
    | { jobId?: string; existingBidId?: string }
    | undefined;
  const jobId = params?.jobId;
  const existingBidId = params?.existingBidId;
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

  // Property Rooms Slice 2 — fetch the job's room scope so the
  // line-item editor can offer "Bill by m²" + "Apply to room".
  const [roomsInScope, setRoomsInScope] = useState<JobRoomScopeOption[]>([]);
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('job_rooms')
          .select('id, name, size_sqm_at_post')
          .eq('job_id', jobId)
          .order('created_at', { ascending: true });
        if (error) return; // RLS may hide rows — quietly skip
        if (!cancelled) {
          // 2026-05-27 audit-82 P1: job_rooms.size_sqm_at_post is
          // NUMERIC(8,2) which supabase-js serializes as a string.
          // LineItemScopeToolbar calls .toFixed(1) on it (throws
          // "toFixed is not a function" on strings) and the bid
          // submit payload reads room.size_sqm_at_post as quantity
          // (then ships a STRING into payload.lineItems[].quantity,
          // breaking type stability on the wire). Coerce once at the
          // read boundary so every downstream consumer sees a number
          // or null.
          const rows = (data ?? []) as Array<{
            id: string;
            name: string;
            size_sqm_at_post: number | string | null;
          }>;
          const normalised = rows.map((r) => {
            const raw = r.size_sqm_at_post;
            const n =
              raw == null ? null : typeof raw === 'number' ? raw : Number(raw);
            return {
              id: r.id,
              name: r.name,
              size_sqm_at_post: n != null && Number.isFinite(n) ? n : null,
            };
          });
          setRoomsInScope(normalised as JobRoomScopeOption[]);
        }
      } catch {
        // Silent — slice 2 controls self-hide when array is empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

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
    // audit-73 P3: skip the load if jobId is missing — the missing-
    // jobId early-return below renders the controlled error state.
    if (!jobId) {
      setLoading(false);
      return;
    }
    loadJob(jobId);
  }, [jobId]);

  const loadJob = async (id: string) => {
    try {
      setJob(await JobService.getJobById(id));
    } catch {
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  // 2026-05-24 audit-26 P2: when the screen is opened in "edit" mode
  // (route.params.existingBidId is set — JobDetailsCTA passes this
  // when the contractor taps "Bid Pending — Edit Bid"), pre-populate
  // the quick-bid fields from the existing bid. /api/contractor/bids
  // is contractor-scoped via auth.uid() so we can safely read by
  // bidId. line_items + terms are not stored on `bids` (they live
  // under `quotes`) so the detailed-mode rehydration is out of scope
  // for this pass — the contractor edits the quick-bid summary and
  // any line-item changes are still done from a fresh "Submit Quote".
  useEffect(() => {
    if (!existingBidId || !jobId) return;
    // 2026-05-26 audit-59 P2: PATCH /api/jobs/:id/bids/:bidId only
    // accepts quick-bid fields. Force quick mode on entry so the
    // line-item state from a prior new-bid attempt can't leak into
    // an Edit Bid render and offer detailed inputs the PATCH would
    // ignore.
    setMode('quick');
    let cancelled = false;
    const resolvedJobId = jobId;
    (async () => {
      try {
        // The contractor has at most one bid per job (DB unique
        // constraint on bids(job_id, contractor_id)), so the
        // jobId-scoped read returns either the existing bid or null
        // and we don't need to filter by bidId on the client.
        const result = await BidService.getMyBidForJob(resolvedJobId);
        if (cancelled || !result || result.id !== existingBidId) return;
        // The /api/contractor/bids GET returns a wider shape than the
        // local Bid type (which is the wire shape of submitBid), so
        // pull the hydration fields via a typed record cast rather
        // than the strict Bid interface.
        const target = result as unknown as Record<string, unknown>;
        const amountField = target.amount;
        if (typeof amountField === 'number') {
          setAmount(String(amountField));
        }
        const text =
          (typeof target.description === 'string' && target.description) ||
          (typeof target.message === 'string' && target.message) ||
          '';
        if (text) setDescription(text);
        const dur = target.estimated_duration_days;
        if (typeof dur === 'number' && dur > 0) {
          setEstimatedDuration(String(dur));
        }
        const startStr = target.proposed_start_date;
        if (typeof startStr === 'string') {
          const parsed = new Date(startStr);
          if (!Number.isNaN(parsed.getTime())) setProposedStartDate(parsed);
        }
      } catch (err) {
        logger.warn('Failed to hydrate existing bid', { err });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [existingBidId, jobId]);

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
  // 2026-05-22: homeowner-set budget no longer anchors contractor bids.
  void bidAmount;
  const isOverBudget = false;
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

  // Property Rooms Slice 2 — apply a unit / room change to one line.
  // When the contractor flips to "Per m²" + picks a room (or vice
  // versa), default the quantity to that room's snapshotted size so
  // they don't have to retype it. Existing non-default quantities
  // are preserved.
  const updateItemScope = (
    index: number,
    change: { unit?: 'item' | 'sqm'; room_id?: string | null }
  ) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next: LineItem = { ...item };
        if (change.unit !== undefined) {
          next.unit = change.unit === 'sqm' ? 'sqm' : 'unit';
        }
        if (change.room_id !== undefined) {
          next.room_id = change.room_id;
        }
        // Snap quantity if the line is now sqm + has a room, and qty
        // is still default 0 or 1.
        if (
          next.unit === 'sqm' &&
          next.room_id &&
          (next.quantity === 0 || next.quantity === 1)
        ) {
          const room = roomsInScope.find((r) => r.id === next.room_id);
          if (room?.size_sqm_at_post) next.quantity = room.size_sqm_at_post;
        }
        return next;
      })
    );
  };

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
      // 2026-05-24 audit-26 P2: when existingBidId is set, route through
      // PATCH /api/jobs/:id/bids/:bidId instead of the create endpoint.
      // The PATCH route only supports {amount, message,
      // estimated_duration_days, proposed_start_date} — the screen's
      // detailed-mode line items + terms can't be updated this way
      // and would be silently dropped, so for now an edit always
      // PATCHes the quick-bid fields regardless of mode and surfaces
      // a notice in the success Alert.
      if (existingBidId) {
        // PATCH /api/jobs/:jobId/bids/:bidId — schema accepts
        // amount, message, estimated_duration_days, proposed_start_date.
        // BidService.updateBid sends `estimated_duration` (string) which
        // gets silently dropped by the route's non-strict Zod schema,
        // so go direct here with the correct field names.
        await mobileApiClient.patch(
          `/api/jobs/${jobId}/bids/${existingBidId}`,
          {
            amount: bidAmount,
            message: description.trim(),
            estimated_duration_days: parseInt(estimatedDuration, 10),
            proposed_start_date: proposedStartDate.toISOString().split('T')[0],
          }
        );
        Alert.alert('Bid Updated', 'Your bid has been updated.', [
          {
            text: 'OK',
            onPress: () => {
              allowExit();
              navigation.goBack();
            },
          },
        ]);
        return;
      }
      const payload: Record<string, unknown> = {
        jobId,
        contractorId: user.id,
        amount: bidAmount,
        description: description.trim(),
        estimatedDurationDays: parseInt(estimatedDuration, 10),
        proposedStartDate: proposedStartDate.toISOString().split('T')[0],
      };
      if (mode === 'detailed') {
        payload.lineItems = lineItems.map((i) => {
          // Property Rooms Slice 2 — only attach `unit`/`room_id`
          // when meaningful so legacy "Each" + no-room rows persist
          // identically to the pre-Slice-2 shape.
          const line: {
            description: string;
            type: string;
            quantity: number;
            unitPrice: number;
            total: number;
            unit?: 'sqm' | 'item';
            room_id?: string | null;
          } = {
            description: i.item_name,
            type: i.category === 'materials' ? 'material' : 'labor',
            quantity: i.quantity,
            unitPrice: i.unit_price,
            total: i.quantity * i.unit_price,
          };
          if (i.unit === 'sqm') line.unit = 'sqm';
          if (i.room_id) line.room_id = i.room_id;
          return line;
        });
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

  // 2026-05-27 audit-73 P3: explicit missing-jobId render path. A
  // malformed deep link or notification-routing fallback that lands
  // here without params previously threw on the route.params
  // destructure. Now we surface a controlled "missing job" screen
  // with a Back affordance instead of crashing into the JS error
  // boundary — same shape as JobDetailsScreen's audit-58 #248 fix.
  if (!jobId) {
    return (
      <View style={styles.loadingContainer}>
        <Text
          style={{ color: me.ink, fontSize: 16, fontWeight: '600' }}
          accessibilityRole='header'
        >
          Job reference missing
        </Text>
        <Text style={{ color: me.ink2, marginTop: 6, textAlign: 'center' }}>
          We couldn't load the job to bid on. Please go back and try again from
          the job detail screen.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          style={{
            marginTop: 18,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: me.brand,
          }}
        >
          <Text style={{ color: me.onBrand, fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
              {/* 2026-05-22: homeowner-set budget badge removed \u2014 price
                  this bid yourself based on the work involved. */}
            </View>
          </View>

          {/* Property Rooms Slice 1 \u2014 rooms-in-scope panel.
              Renders only when the job has a room snapshot; legacy
              jobs (no snapshot) get nothing here, preserving the
              original look. */}
          <JobRoomScope jobId={jobId} />

          {/* Mode toggle.
              2026-05-26 audit-59 P2: hide detailed-quote tab in edit
              mode. The PATCH /api/jobs/:id/bids/:bidId route only
              accepts {amount, message, estimated_duration_days,
              proposed_start_date} — line_items + tax + terms would
              be silently dropped if the contractor edited them and
              tapped Save. Until the PATCH route is extended to
              update the linked contractor_quotes row, force quick
              mode on edit and don't render the toggle at all.
              New-bid flow is unchanged. */}
          {!existingBidId && (
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  mode === 'quick' && styles.modeBtnActive,
                ]}
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
          )}

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
                roomsInScope={roomsInScope}
                onItemScopeChange={updateItemScope}
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
