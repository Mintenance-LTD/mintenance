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
import { QuoteBuilderService, ContractorQuote } from '../../services/QuoteBuilderService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import type { ProfileStackParamList } from '../../navigation/types';

interface QuoteDetailScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'QuoteDetail'>;
  route: RouteProp<ProfileStackParamList, 'QuoteDetail'>;
}

const STATUS_COLORS: Record<string, string> = {
  accepted: theme.colors.success,
  rejected: theme.colors.error,
  sent: '#717171',
  viewed: theme.colors.info,
  expired: theme.colors.textSecondary,
  draft: theme.colors.textTertiary,
};

export const QuoteDetailScreen: React.FC<QuoteDetailScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const { quoteId } = route.params;

  const [quote, setQuote] = useState<ContractorQuote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuote();
  }, [quoteId]);

  const loadQuote = async () => {
    if (!user) return;
    try {
      const quotes = await QuoteBuilderService.getQuotes(user.id);
      const found = quotes.find(q => q.id === quoteId);
      setQuote(found ?? null);
    } catch {
      toast.error('Failed to load quote');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    Alert.alert('Send Quote', 'Send this quote to the client?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          if (!quote || !user) return;
          try {
            await QuoteBuilderService.sendQuote(quote.id);
            toast.success('Quote sent');
            await loadQuote();
          } catch {
            toast.error('Failed to send quote');
          }
        },
      },
    ]);
  };

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <LoadingSpinner message="Loading quote…" />;

  if (!quote) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="document-outline" size={64} color={theme.colors.textTertiary} />
        <Text style={styles.emptyText}>Quote not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[quote.status] ?? '#717171';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quote #{quote.quote_number}</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('CreateQuote', { jobId: quote.job_id })}
        >
          <Ionicons name="pencil" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: statusColor }]}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{quote.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.totalAmount}>£{quote.total_amount.toFixed(2)}</Text>
          <Text style={styles.projectTitle}>{quote.project_title}</Text>
        </View>

        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <Text style={styles.clientName}>{quote.client_name}</Text>
          {quote.client_email ? <Text style={styles.detailText}>{quote.client_email}</Text> : null}
          {quote.client_phone ? <Text style={styles.detailText}>{quote.client_phone}</Text> : null}
        </View>

        {/* Project */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project</Text>
          <Text style={styles.valueText}>{quote.project_title}</Text>
          {quote.project_description ? (
            <Text style={styles.detailText}>{quote.project_description}</Text>
          ) : null}
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>{formatDate(quote.created_at)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Valid Until</Text>
            <Text style={styles.detailValue}>{formatDate(quote.valid_until)}</Text>
          </View>
          {quote.sent_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Sent</Text>
              <Text style={styles.detailValue}>{formatDate(quote.sent_at)}</Text>
            </View>
          )}
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financials</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subtotal</Text>
            <Text style={styles.detailValue}>£{quote.subtotal.toFixed(2)}</Text>
          </View>
          {quote.discount_amount ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Discount</Text>
              <Text style={[styles.detailValue, { color: theme.colors.success }]}>
                -£{quote.discount_amount.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tax ({quote.tax_rate}%)</Text>
            <Text style={styles.detailValue}>£{quote.tax_amount.toFixed(2)}</Text>
          </View>
          <View style={[styles.detailRow, styles.totalRowFinal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>£{quote.total_amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Notes */}
        {quote.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{quote.notes}</Text>
          </View>
        ) : null}

        {/* Actions */}
        {quote.status === 'draft' && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('CreateQuote', { jobId: quote.job_id })}
            >
              <Ionicons name="pencil-outline" size={18} color='#717171' />
              <Text style={styles.editButtonText}>Edit Quote</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Ionicons name="send-outline" size={18} color={theme.colors.textInverse} />
              <Text style={styles.sendButtonText}>Send to Client</Text>
            </TouchableOpacity>
          </View>
        )}

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
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  headerButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  scroll: { flex: 1 },
  statusCard: {
    margin: 16,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    borderLeftWidth: 4,
    ...theme.shadows.base,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.sm, marginBottom: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '700', color: theme.colors.textInverse },
  totalAmount: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary },
  projectTitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  section: {
    backgroundColor: theme.colors.background,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    ...theme.shadows.sm,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.textTertiary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  clientName: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  detailText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  valueText: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 14, color: theme.colors.textSecondary },
  detailValue: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500' },
  totalRowFinal: { borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 8, paddingTop: 12 },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  grandTotalValue: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  notesText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  actionsSection: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 4 },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    gap: 6,
    backgroundColor: theme.colors.background,
  },
  editButtonText: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    gap: 6,
  },
  sendButtonText: { fontSize: 14, fontWeight: '600', color: theme.colors.textInverse },
  emptyText: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 16 },
  backLink: { fontSize: 14, color: theme.colors.textPrimary, marginTop: 12 },
});

export default QuoteDetailScreen;
