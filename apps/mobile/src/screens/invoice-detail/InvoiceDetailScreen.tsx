import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { FinancialManagementService } from '../../services/contractor-business';
import type { Invoice } from '../../services/contractor-business/types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import type { JobsStackParamList } from '../../navigation/types';

interface InvoiceDetailScreenProps {
  navigation: NativeStackNavigationProp<JobsStackParamList, 'InvoiceDetail'>;
  route: RouteProp<JobsStackParamList, 'InvoiceDetail'>;
}

const STATUS_COLORS: Record<string, string> = {
  paid: theme.colors.success,
  overdue: theme.colors.error,
  sent: theme.colors.warning,
  draft: theme.colors.textSecondary,
  cancelled: theme.colors.textTertiary,
};

export const InvoiceDetailScreen: React.FC<InvoiceDetailScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const { invoiceId } = route.params;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    if (!user) return;
    try {
      const invoices = await FinancialManagementService.getInvoices(user.id);
      const found = invoices.find(inv => inv.id === invoiceId);
      setInvoice(found ?? null);
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async () => {
    if (!invoice || !user) return;
    try {
      await FinancialManagementService.updateInvoiceStatus(invoice.id, 'sent', user.id);
      toast.success('Reminder sent');
      await loadInvoice();
    } catch {
      toast.error('Failed to send reminder');
    }
  };

  const handleMarkPaid = () => {
    if (!invoice || !user) return;
    Alert.alert('Mark as Paid', `Mark invoice #${invoice.invoice_number} as paid?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid',
        onPress: async () => {
          try {
            await FinancialManagementService.updateInvoiceStatus(invoice.id, 'paid', user.id);
            toast.success('Invoice marked as paid');
            await loadInvoice();
          } catch {
            toast.error('Failed to update invoice');
          }
        },
      },
    ]);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) return <LoadingSpinner message="Loading invoice…" />;

  if (!invoice) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="document-outline" size={64} color={theme.colors.textTertiary} />
        <Text style={styles.emptyText}>Invoice not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[invoice.status] ?? theme.colors.primary;
  const canSendReminder = invoice.status === 'sent' || invoice.status === 'overdue';
  const canMarkPaid = invoice.status !== 'paid' && invoice.status !== 'cancelled';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice #{invoice.invoice_number}</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('CreateInvoice', { invoiceId: invoice.id })}
        >
          <Ionicons name="pencil" size={22} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: statusColor }]}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{invoice.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.invoiceTotal}>£{invoice.total_amount.toFixed(2)}</Text>
          <Text style={styles.dueDateText}>Due {formatDate(invoice.due_date)}</Text>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.clientName}>{invoice.client_name || 'Client'}</Text>
          {invoice.job_id && (
            <Text style={styles.detailText}>Job Ref: {invoice.job_id}</Text>
          )}
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Issue Date</Text>
            <Text style={styles.detailValue}>{formatDate(invoice.issue_date)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Due Date</Text>
            <Text style={[styles.detailValue, invoice.status === 'overdue' && { color: theme.colors.error }]}>
              {formatDate(invoice.due_date)}
            </Text>
          </View>
          {invoice.paid_date && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Paid Date</Text>
              <Text style={[styles.detailValue, { color: theme.colors.success }]}>
                {formatDate(invoice.paid_date)}
              </Text>
            </View>
          )}
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          {invoice.line_items.map((item, index) => (
            <View key={index} style={styles.lineItem}>
              <View style={styles.lineItemLeft}>
                <Text style={styles.lineItemDesc}>{item.description}</Text>
                <Text style={styles.lineItemMeta}>
                  {item.quantity} × £{item.rate.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.lineItemAmount}>£{item.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>£{invoice.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT</Text>
            <Text style={styles.totalValue}>£{invoice.tax_amount.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowFinal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>£{invoice.total_amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actionsSection}>
          {canSendReminder && (
            <TouchableOpacity style={styles.reminderButton} onPress={handleSendReminder}>
              <Ionicons name="mail-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.reminderButtonText}>Send Reminder</Text>
            </TouchableOpacity>
          )}
          {canMarkPaid && (
            <TouchableOpacity style={styles.paidButton} onPress={handleMarkPaid}>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.textInverse} />
              <Text style={styles.paidButtonText}>Mark as Paid</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.primary,
  },
  headerButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textInverse },
  scroll: { flex: 1 },
  statusCard: {
    margin: 16,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    borderLeftWidth: 4,
    alignItems: 'flex-start',
    ...theme.shadows.base,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 12,
  },
  statusText: { fontSize: 12, fontWeight: '700', color: theme.colors.textInverse },
  invoiceTotal: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary },
  dueDateText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  section: {
    backgroundColor: theme.colors.background,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    ...theme.shadows.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  clientName: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  detailText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 14, color: theme.colors.textSecondary },
  detailValue: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500' },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  lineItemLeft: { flex: 1, paddingRight: 12 },
  lineItemDesc: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500' },
  lineItemMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  lineItemAmount: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalRowFinal: { borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 14, color: theme.colors.textSecondary },
  totalValue: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500' },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  grandTotalValue: { fontSize: 18, fontWeight: '700', color: theme.colors.primary },
  notesText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  actionsSection: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 4 },
  reminderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    gap: 6,
    backgroundColor: theme.colors.background,
  },
  reminderButtonText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  paidButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    gap: 6,
  },
  paidButtonText: { fontSize: 14, fontWeight: '600', color: theme.colors.textInverse },
  emptyText: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 16 },
  backLink: { fontSize: 14, color: theme.colors.primary, marginTop: 12 },
});

export default InvoiceDetailScreen;
