import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
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
  accepted: '#10B981',
  rejected: '#EF4444',
  sent: '#717171',
  viewed: '#3B82F6',
  expired: '#717171',
  draft: '#B0B0B0',
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
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014';

  if (loading) return <LoadingSpinner message="Loading quote\u2026" />;

  if (!quote) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="document-outline" size={32} color="#B0B0B0" />
        </View>
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
          <Ionicons name="arrow-back" size={24} color="#222222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quote #{quote.quote_number}</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('CreateQuote', { jobId: quote.job_id })}
        >
          <Ionicons name="pencil" size={22} color="#222222" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{quote.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.totalAmount}>{'\u00A3'}{quote.total_amount.toFixed(2)}</Text>
          <Text style={styles.projectTitle}>{quote.project_title}</Text>
        </View>

        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLIENT</Text>
          <Text style={styles.clientName}>{quote.client_name}</Text>
          {quote.client_email ? <Text style={styles.detailText}>{quote.client_email}</Text> : null}
          {quote.client_phone ? <Text style={styles.detailText}>{quote.client_phone}</Text> : null}
        </View>

        {/* Project */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROJECT</Text>
          <Text style={styles.valueText}>{quote.project_title}</Text>
          {quote.project_description ? (
            <Text style={styles.detailText}>{quote.project_description}</Text>
          ) : null}
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATES</Text>
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
          <Text style={styles.sectionTitle}>FINANCIALS</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subtotal</Text>
            <Text style={styles.detailValue}>{'\u00A3'}{quote.subtotal.toFixed(2)}</Text>
          </View>
          {quote.discount_amount ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Discount</Text>
              <Text style={[styles.detailValue, { color: '#10B981' }]}>
                -{'\u00A3'}{quote.discount_amount.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tax ({quote.tax_rate}%)</Text>
            <Text style={styles.detailValue}>{'\u00A3'}{quote.tax_amount.toFixed(2)}</Text>
          </View>
          <View style={[styles.detailRow, styles.totalRowFinal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{'\u00A3'}{quote.total_amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Notes */}
        {quote.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTES</Text>
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
              <Ionicons name="pencil-outline" size={18} color="#717171" />
              <Text style={styles.editButtonText}>Edit Quote</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Ionicons name="send-outline" size={18} color="#FFFFFF" />
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
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  centered: { justifyContent: 'center', alignItems: 'center' },
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
  headerButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#222222' },
  scroll: { flex: 1 },
  statusCard: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  totalAmount: { fontSize: 28, fontWeight: '700', color: '#222222' },
  projectTitle: { fontSize: 14, color: '#717171', marginTop: 4 },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#B0B0B0', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  clientName: { fontSize: 16, fontWeight: '600', color: '#222222' },
  detailText: { fontSize: 13, color: '#717171', marginTop: 4 },
  valueText: { fontSize: 14, fontWeight: '600', color: '#222222' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 14, color: '#717171' },
  detailValue: { fontSize: 14, color: '#222222', fontWeight: '600' },
  totalRowFinal: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EBEBEB', marginTop: 8, paddingTop: 12 },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#222222' },
  grandTotalValue: { fontSize: 18, fontWeight: '700', color: '#222222' },
  notesText: { fontSize: 14, color: '#717171', lineHeight: 20 },
  actionsSection: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 4 },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 28,
    paddingVertical: 14,
    gap: 6,
  },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#222222' },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222222',
    borderRadius: 28,
    paddingVertical: 14,
    gap: 6,
  },
  sendButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 16, color: '#717171', marginTop: 16 },
  backLink: { fontSize: 14, color: '#222222', fontWeight: '600', marginTop: 12 },
});

export default QuoteDetailScreen;
