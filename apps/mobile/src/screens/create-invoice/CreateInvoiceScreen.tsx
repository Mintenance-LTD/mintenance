import React, { useState } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#222222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Invoice</Text>
        <TouchableOpacity
          style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
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
            placeholderTextColor="#B0B0B0"
            value={clientName}
            onChangeText={setClientName}
          />
          <TextInput
            style={styles.input}
            placeholder="Job reference (optional)"
            placeholderTextColor="#B0B0B0"
            value={jobRef}
            onChangeText={setJobRef}
          />
        </View>

        {/* Due Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Due Date</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#717171" />
            <Text style={styles.dateText}>{formatDate(dueDate)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#B0B0B0" />
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
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {lineItems.map((item, index) => (
            <View key={index} style={styles.lineItem}>
              <View style={styles.lineItemHeader}>
                <Text style={styles.lineItemLabel}>Item {index + 1}</Text>
                {lineItems.length > 1 && (
                  <TouchableOpacity onPress={() => removeLineItem(index)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Description *"
                placeholderTextColor="#B0B0B0"
                value={item.description}
                onChangeText={v => updateLineItem(index, 'description', v)}
              />
              <View style={styles.lineItemRow}>
                <View style={styles.lineItemField}>
                  <Text style={styles.fieldLabel}>Qty</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    placeholderTextColor="#B0B0B0"
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
                    placeholderTextColor="#B0B0B0"
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
            placeholderTextColor="#B0B0B0"
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
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: { padding: 8, minWidth: 60 },
  saveButtonDisabled: { opacity: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#222222' },
  saveText: { fontSize: 16, fontWeight: '600', color: '#222222', textAlign: 'right' },
  scroll: { flex: 1 },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222222', marginBottom: 12 },
  input: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#222222',
    marginBottom: 8,
  },
  notesInput: { height: 80, paddingTop: 12 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  dateText: { flex: 1, fontSize: 14, color: '#222222' },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222222',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  addItemText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  lineItem: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  lineItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lineItemLabel: { fontSize: 13, fontWeight: '600', color: '#717171' },
  lineItemRow: { flexDirection: 'row', gap: 8 },
  lineItemField: { flex: 1 },
  fieldLabel: { fontSize: 11, color: '#B0B0B0', marginBottom: 4 },
  amountDisplay: {
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  amountText: { fontSize: 14, color: '#222222', fontWeight: '500' },
  totalsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalRowFinal: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EBEBEB', marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 14, color: '#717171' },
  totalValue: { fontSize: 14, color: '#222222', fontWeight: '500' },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#222222' },
  grandTotalValue: { fontSize: 18, fontWeight: '700', color: '#222222' },
});

export default CreateInvoiceScreen;
