import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { FinancialManagementService } from '../../services/contractor-business';
import type { InvoiceLineItem } from '../../services/contractor-business/types';
import type { JobsStackParamList } from '../../navigation/types';

interface CreateInvoiceScreenProps {
  navigation: NativeStackNavigationProp<JobsStackParamList, 'CreateInvoice'>;
}

interface LineItemDraft {
  description: string;
  quantity: string;
  rate: string;
}

export const CreateInvoiceScreen: React.FC<CreateInvoiceScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();

  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState('');
  const [jobRef, setJobRef] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    { description: '', quantity: '1', rate: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addLineItem = () => {
    setLineItems(prev => [...prev, { description: '', quantity: '1', rate: '' }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItemDraft, value: string) => {
    setLineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
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
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const generateInvoiceNumber = () =>
    `INV-${Date.now().toString().slice(-6)}`;

  const handleSubmit = async () => {
    if (!user) return;
    if (!clientName.trim()) {
      toast.error('Client name required', 'Please enter a client name.');
      return;
    }
    const validItems = lineItems.filter(i => i.description.trim() && parseFloat(i.rate) > 0);
    if (validItems.length === 0) {
      toast.error('Line items required', 'Add at least one item with a description and rate.');
      return;
    }

    setSubmitting(true);
    try {
      const parsedItems: InvoiceLineItem[] = validItems.map(i => ({
        description: i.description.trim(),
        quantity: parseFloat(i.quantity) || 1,
        rate: parseFloat(i.rate),
        amount: (parseFloat(i.quantity) || 1) * parseFloat(i.rate),
      }));

      await FinancialManagementService.createInvoice({
        contractor_id: user.id,
        client_id: clientId || user.id,
        client_name: clientName.trim(),
        job_id: jobRef.trim() || undefined,
        invoice_number: generateInvoiceNumber(),
        status: 'draft',
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        due_date: dueDate.toISOString(),
        issue_date: new Date().toISOString(),
        notes: notes.trim() || undefined,
        line_items: parsedItems,
      });

      toast.success('Invoice created', 'Your invoice has been saved as a draft.');
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
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Invoice</Text>
        <TouchableOpacity
          style={[styles.headerButton, submitting && styles.headerButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.saveText}>{submitting ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Client Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <TextInput
            style={styles.input}
            placeholder="Client name *"
            placeholderTextColor={theme.colors.textTertiary}
            value={clientName}
            onChangeText={setClientName}
          />
          <TextInput
            style={styles.input}
            placeholder="Job reference (optional)"
            placeholderTextColor={theme.colors.textTertiary}
            value={jobRef}
            onChangeText={setJobRef}
          />
        </View>

        {/* Due Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Due Date</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color='#717171' />
            <Text style={styles.dateText}>{formatDate(dueDate)}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
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
            <TouchableOpacity style={styles.addItemButton} onPress={addLineItem}>
              <Ionicons name="add" size={18} color='#FFFFFF' />
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {lineItems.map((item, index) => (
            <View key={index} style={styles.lineItem}>
              <View style={styles.lineItemHeader}>
                <Text style={styles.lineItemLabel}>Item {index + 1}</Text>
                {lineItems.length > 1 && (
                  <TouchableOpacity onPress={() => removeLineItem(index)}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Description *"
                placeholderTextColor={theme.colors.textTertiary}
                value={item.description}
                onChangeText={v => updateLineItem(index, 'description', v)}
              />
              <View style={styles.lineItemRow}>
                <View style={styles.lineItemField}>
                  <Text style={styles.fieldLabel}>Qty</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="numeric"
                    value={item.quantity}
                    onChangeText={v => updateLineItem(index, 'quantity', v)}
                  />
                </View>
                <View style={styles.lineItemField}>
                  <Text style={styles.fieldLabel}>Rate (£)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={item.rate}
                    onChangeText={v => updateLineItem(index, 'rate', v)}
                  />
                </View>
                <View style={styles.lineItemField}>
                  <Text style={styles.fieldLabel}>Amount</Text>
                  <View style={[styles.input, styles.amountDisplay]}>
                    <Text style={styles.amountText}>
                      £{((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)).toFixed(2)}
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
            placeholder="Payment terms, notes to client…"
            placeholderTextColor={theme.colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>£{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT (20%)</Text>
            <Text style={styles.totalValue}>£{taxAmount.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowFinal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>£{total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  headerButton: { padding: 8, minWidth: 60 },
  headerButtonDisabled: { opacity: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  saveText: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, textAlign: 'right' },
  scroll: { flex: 1 },
  section: {
    backgroundColor: theme.colors.background,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    ...theme.shadows.sm,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surfaceSecondary,
    marginBottom: 8,
  },
  notesInput: { height: 80, paddingTop: 10 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: 8,
  },
  dateText: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222222',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  addItemText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  lineItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  lineItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lineItemLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  lineItemRow: { flexDirection: 'row', gap: 8 },
  lineItemField: { flex: 1 },
  fieldLabel: { fontSize: 11, color: theme.colors.textTertiary, marginBottom: 4 },
  amountDisplay: {
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  amountText: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500' },
  totalsSection: {
    backgroundColor: theme.colors.background,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    ...theme.shadows.sm,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalRowFinal: { borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 14, color: theme.colors.textSecondary },
  totalValue: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500' },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  grandTotalValue: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
});

export default CreateInvoiceScreen;
