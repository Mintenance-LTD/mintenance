import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRoute, type RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { FinancialManagementService } from '../../services/contractor-business';
import type { InvoiceLineItem } from '../../services/contractor-business/types';
import type { ProfileStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';
import { formatCurrency } from '../../utils/formatCurrency';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { logger } from '../../utils/logger';

interface CreateInvoiceScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'CreateInvoice'>;
}

interface LineItemDraft {
  description: string;
  quantity: string;
  rate: string;
}

export const CreateInvoiceScreen: React.FC<CreateInvoiceScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();

  // Audit P1 #14 (2026-04-25): pre-fill from time-tracking. The
  // TimeTrackingScreen "Create Invoice" CTA hands us aggregated
  // billable hours grouped by job; we seed the form state once on
  // first render so the contractor can edit before saving. invoiceId
  // (edit mode) takes precedence — never overwrite an existing draft.
  const route = useRoute<RouteProp<ProfileStackParamList, 'CreateInvoice'>>();
  const seededFromTimeTracking =
    !route.params?.invoiceId &&
    Array.isArray(route.params?.initialLineItems) &&
    route.params.initialLineItems.length > 0;

  const [clientName, setClientName] = useState(
    seededFromTimeTracking ? (route.params?.clientName ?? '') : ''
  );
  const [clientId, setClientId] = useState('');
  const [jobRef, setJobRef] = useState(
    seededFromTimeTracking ? (route.params?.jobRef ?? '') : ''
  );
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [lineItems, setLineItems] = useState<LineItemDraft[]>(() => {
    // 2026-04-30 audit P1: replace `route.params!.initialLineItems!`
    // with optional-chaining + a guard. If the screen is opened
    // without seeded params (deep link, navigator hot-reload) the
    // form falls back to a single empty row instead of crashing.
    const seeded = route.params?.initialLineItems;
    if (seededFromTimeTracking && Array.isArray(seeded) && seeded.length > 0) {
      // Defensive copy — never mutate route params.
      return seeded.map((i) => ({ ...i }));
    }
    return [{ description: '', quantity: '1', rate: '' }];
  });
  const [submitting, setSubmitting] = useState(false);
  // 2026-05-23 audit-24 P1: when navigated with `invoiceId`, hydrate
  // the form from the existing invoice and PATCH on submit instead of
  // duplicating with another POST.
  const editingInvoiceId = route.params?.invoiceId ?? null;
  const [loadingExisting, setLoadingExisting] = useState(!!editingInvoiceId);

  useEffect(() => {
    if (!editingInvoiceId || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const invoices = await FinancialManagementService.getInvoices(user.id);
        const existing = invoices.find((inv) => inv.id === editingInvoiceId);
        if (!existing || cancelled) return;
        setClientName(existing.client_name ?? '');
        // The Invoice type doesn't expose job_id but server invoices
        // carry it; cast through unknown for runtime read. UUID jobIds
        // surface as Job reference; free-text references live in notes.
        const jobIdRaw = (existing as unknown as { job_id?: string | null })
          .job_id;
        if (jobIdRaw) setJobRef(jobIdRaw);
        if (existing.notes) setNotes(existing.notes);
        if (existing.due_date) setDueDate(new Date(existing.due_date));
        const items = Array.isArray(existing.line_items)
          ? existing.line_items
          : [];
        if (items.length > 0) {
          setLineItems(
            items.map((li) => ({
              description: li.description ?? '',
              quantity: String(li.quantity ?? 1),
              rate: String(li.unit_price ?? li.rate ?? 0),
            }))
          );
        }
      } catch (e) {
        logger.warn('Failed to load invoice for edit', {
          invoiceId: editingInvoiceId,
          error: e instanceof Error ? e.message : String(e),
        });
        toast.error('Failed to load invoice', 'Please go back and try again.');
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingInvoiceId, user?.id, toast]);

  // Discard-prompt — dirty when the user has typed anything OR when
  // a non-trivial line item exists (covers both the time-tracking
  // pre-fill path and the from-scratch path).
  const hasNonEmptyLineItem = lineItems.some(
    (i) => i.description.trim() || (parseFloat(i.rate) || 0) > 0
  );
  const isDirty = !!(clientName || jobRef || notes || hasNonEmptyLineItem);
  const allowExit = useUnsavedChanges(isDirty);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { description: '', quantity: '1', rate: '' },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItemDraft,
    value: string
  ) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const calculateSubtotal = () =>
    lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      return sum + qty * rate;
    }, 0);

  const subtotal = calculateSubtotal();
  const taxAmount = subtotal * 0.2; // 20% VAT
  const total = subtotal + taxAmount;

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const generateInvoiceNumber = () => `INV-${Date.now().toString().slice(-6)}`;

  const handleSubmit = async () => {
    if (!user) return;
    if (!clientName.trim()) {
      toast.error('Client name required', 'Please enter a client name.');
      return;
    }
    const validItems = lineItems.filter(
      (i) => i.description.trim() && parseFloat(i.rate) > 0
    );
    if (validItems.length === 0) {
      toast.error(
        'Line items required',
        'Add at least one item with a description and rate.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const parsedItems: InvoiceLineItem[] = validItems.map((i) => ({
        description: i.description.trim(),
        quantity: parseFloat(i.quantity) || 1,
        rate: parseFloat(i.rate),
        amount: (parseFloat(i.quantity) || 1) * parseFloat(i.rate),
      }));

      // 2026-05-23 audit-17 P1: previously sent `client_id: clientId || user.id`.
      // The form has no client picker — clientId state is never set — so the
      // fallback shipped the contractor's own profile UUID. The API treats
      // clientId as a contractor_clients.id and 400'd every "type a client
      // name and save" attempt. Server already accepts the clientName-only
      // path; only send clientId when an actual contractor_clients row is
      // selected.
      // 2026-05-23 audit-17 P2: the "Job reference" input is free-text
      // (e.g. "Kitchen repaint", "JOB-1024") but was being forwarded as
      // job_id which the API enforces as UUID — so any human reference
      // rejected the whole invoice. Free-text references now ride along
      // in notes so the contractor still records them; the field is only
      // forwarded as job_id when it parses as a UUID (real linkage path
      // for time-tracking → invoice flows that pass an actual jobId).
      const UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const jobRefTrimmed = jobRef.trim();
      const jobRefIsUuid =
        jobRefTrimmed.length > 0 && UUID_RE.test(jobRefTrimmed);
      const noteParts: string[] = [];
      if (notes.trim()) noteParts.push(notes.trim());
      if (jobRefTrimmed && !jobRefIsUuid) {
        noteParts.push(`Job reference: ${jobRefTrimmed}`);
      }

      if (editingInvoiceId) {
        // 2026-05-23 audit-24 P1: edit path. PATCH the existing
        // invoice rather than creating another draft. Server
        // recomputes subtotal/tax/total from lineItems + taxRate, so
        // we don't ship the pre-computed amounts.
        await FinancialManagementService.updateInvoice(editingInvoiceId, {
          clientName: clientName.trim(),
          lineItems: parsedItems,
          taxRate: 20,
          dueDate: dueDate.toISOString(),
          notes: noteParts.length > 0 ? noteParts.join('\n\n') : undefined,
        });
        toast.success('Invoice updated', 'Your changes have been saved.');
      } else {
        await FinancialManagementService.createInvoice({
          contractor_id: user.id,
          client_id: clientId || undefined,
          client_name: clientName.trim(),
          job_id: jobRefIsUuid ? jobRefTrimmed : undefined,
          invoice_number: generateInvoiceNumber(),
          status: 'draft',
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          due_date: dueDate.toISOString(),
          issue_date: new Date().toISOString(),
          notes: noteParts.length > 0 ? noteParts.join('\n\n') : undefined,
          line_items: parsedItems,
        });

        toast.success(
          'Invoice created',
          'Your invoice has been saved as a draft.'
        );
      }
      allowExit();
      navigation.goBack();
    } catch {
      toast.error('Failed to create invoice', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {/* Audit follow-up (2026-04-29): icon-only back button +
            text-only save button now expose explicit
            `accessibilityLabel`s. The save button's label switches
            to "Saving invoice" while submitting so screen readers
            announce the in-flight state. */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons name='arrow-back' size={22} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingInvoiceId ? 'Edit Invoice' : 'New Invoice'}
        </Text>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (submitting || loadingExisting) && styles.saveButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || loadingExisting}
          accessibilityRole='button'
          accessibilityLabel={submitting ? 'Saving invoice' : 'Save invoice'}
          accessibilityState={{ disabled: submitting, busy: submitting }}
        >
          <Text style={styles.saveText}>{submitting ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        {/* Audit P1 #14 (2026-04-25): tell the contractor we pre-filled
            line items from their time tracking, so they aren't surprised
            by the populated form. */}
        {seededFromTimeTracking && (
          <View style={styles.timeTrackingHint}>
            <Ionicons name='time-outline' size={16} color={me.brand} />
            <Text style={styles.timeTrackingHintText}>
              {
                "Pre-filled from this week's billable hours. Edit before saving."
              }
            </Text>
          </View>
        )}

        {/* Client Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <TextInput
            style={styles.input}
            placeholder='Client name *'
            placeholderTextColor={me.ink3}
            value={clientName}
            onChangeText={setClientName}
          />
          <TextInput
            style={styles.input}
            placeholder='Job reference (optional)'
            placeholderTextColor={me.ink3}
            value={jobRef}
            onChangeText={setJobRef}
          />
        </View>

        {/* Due Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Due Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name='calendar-outline' size={18} color={me.ink2} />
            <Text style={styles.dateText}>{formatDate(dueDate)}</Text>
            <Ionicons name='chevron-forward' size={16} color={me.ink3} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode='date'
              minimumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setDueDate(date);
              }}
            />
          )}
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={addLineItem}
            >
              <Ionicons name='add' size={18} color={me.onBrand} />
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {lineItems.map((item, index) => (
            <View key={index} style={styles.lineItem}>
              <View style={styles.lineItemHeader}>
                <Text style={styles.lineItemLabel}>Item {index + 1}</Text>
                {lineItems.length > 1 && (
                  <TouchableOpacity onPress={() => removeLineItem(index)}>
                    <Ionicons name='trash-outline' size={18} color={me.errFg} />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.input}
                placeholder='Description *'
                placeholderTextColor={me.ink3}
                value={item.description}
                onChangeText={(v) => updateLineItem(index, 'description', v)}
              />
              <View style={styles.lineItemRow}>
                <View style={styles.lineItemField}>
                  <Text style={styles.fieldLabel}>Qty</Text>
                  <TextInput
                    style={styles.input}
                    placeholder='1'
                    placeholderTextColor={me.ink3}
                    keyboardType='numeric'
                    value={item.quantity}
                    onChangeText={(v) => updateLineItem(index, 'quantity', v)}
                  />
                </View>
                <View style={styles.lineItemField}>
                  <Text style={styles.fieldLabel}>Rate (£)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder='0.00'
                    placeholderTextColor={me.ink3}
                    keyboardType='decimal-pad'
                    value={item.rate}
                    onChangeText={(v) => updateLineItem(index, 'rate', v)}
                  />
                </View>
                <View style={styles.lineItemField}>
                  <Text style={styles.fieldLabel}>Amount</Text>
                  <View style={[styles.input, styles.amountDisplay]}>
                    <Text style={styles.amountText}>
                      {formatCurrency(
                        (parseFloat(item.quantity) || 0) *
                          (parseFloat(item.rate) || 0)
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder='Payment terms, notes to client…'
            placeholderTextColor={me.ink3}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical='top'
          />
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT (20%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(taxAmount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowFinal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: me.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: { padding: 8, minWidth: 60 },
  saveButtonDisabled: { opacity: 0.5 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: me.ink,
    textAlign: 'right',
  },
  scroll: { flex: 1 },
  section: {
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    ...me.shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 12,
  },
  input: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: me.ink,
    marginBottom: 8,
  },
  notesInput: { height: 80, paddingTop: 12 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.bg2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  dateText: { flex: 1, fontSize: 14, color: me.ink },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.ink,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  addItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: me.onBrand,
  },
  lineItem: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lineItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
  },
  lineItemRow: { flexDirection: 'row', gap: 8 },
  lineItemField: { flex: 1 },
  fieldLabel: {
    fontSize: 11,
    color: me.ink3,
    marginBottom: 4,
  },
  amountDisplay: {
    justifyContent: 'center',
    backgroundColor: me.surface,
  },
  amountText: {
    fontSize: 14,
    color: me.ink,
    fontWeight: '500',
  },
  totalsSection: {
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    ...me.shadow.card,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalRowFinal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: { fontSize: 14, color: me.ink2 },
  totalValue: {
    fontSize: 14,
    color: me.ink,
    fontWeight: '500',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  // Audit P1 #14 (2026-04-25): pre-fill-from-time-tracking hint banner.
  timeTrackingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: me.brandSoft,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  timeTrackingHintText: {
    flex: 1,
    fontSize: 13,
    color: me.ink,
    fontWeight: '500',
  },
});
