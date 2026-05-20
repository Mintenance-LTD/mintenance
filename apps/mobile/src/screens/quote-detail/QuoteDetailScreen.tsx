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
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import {
  QuoteBuilderService,
  ContractorQuote,
} from '../../services/QuoteBuilderService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import type { ProfileStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';

interface QuoteDetailScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'QuoteDetail'>;
  route: RouteProp<ProfileStackParamList, 'QuoteDetail'>;
}

const STATUS_COLORS: Record<string, string> = {
  accepted: me.brand,
  rejected: me.errFg,
  sent: me.ink2,
  viewed: '#3B82F6',
  expired: me.ink2,
  draft: me.ink3,
};

export const QuoteDetailScreen: React.FC<QuoteDetailScreenProps> = ({
  navigation,
  route,
}) => {
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
      const found = quotes.find((q) => q.id === quoteId);
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
    iso
      ? new Date(iso).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '\u2014';

  if (loading) return <LoadingSpinner message='Loading quote\u2026' />;

  if (!quote) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name='document-outline' size={32} color={me.ink3} />
        </View>
        <Text style={styles.emptyText}>Quote not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[quote.status] ?? me.ink2;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quote #{quote.quote_number}</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            navigation.navigate('CreateQuote', { jobId: quote.job_id })
          }
        >
          <Ionicons name='pencil' size={22} color={me.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{quote.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.totalAmount}>
            {'\u00A3'}
            {quote.total_amount.toFixed(2)}
          </Text>
          <Text style={styles.projectTitle}>{quote.project_title}</Text>
        </View>

        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLIENT</Text>
          <Text style={styles.clientName}>{quote.client_name}</Text>
          {quote.client_email ? (
            <Text style={styles.detailText}>{quote.client_email}</Text>
          ) : null}
          {quote.client_phone ? (
            <Text style={styles.detailText}>{quote.client_phone}</Text>
          ) : null}
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
            <Text style={styles.detailValue}>
              {formatDate(quote.created_at)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Valid Until</Text>
            <Text style={styles.detailValue}>
              {formatDate(quote.valid_until)}
            </Text>
          </View>
          {quote.sent_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Sent</Text>
              <Text style={styles.detailValue}>
                {formatDate(quote.sent_at)}
              </Text>
            </View>
          )}
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FINANCIALS</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subtotal</Text>
            <Text style={styles.detailValue}>
              {'\u00A3'}
              {quote.subtotal.toFixed(2)}
            </Text>
          </View>
          {quote.discount_amount ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Discount</Text>
              <Text style={[styles.detailValue, { color: me.brand }]}>
                -{'\u00A3'}
                {quote.discount_amount.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tax ({quote.tax_rate}%)</Text>
            <Text style={styles.detailValue}>
              {'\u00A3'}
              {quote.tax_amount.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.detailRow, styles.totalRowFinal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {'\u00A3'}
              {quote.total_amount.toFixed(2)}
            </Text>
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
              onPress={() =>
                navigation.navigate('CreateQuote', { jobId: quote.job_id })
              }
            >
              <Ionicons name='pencil-outline' size={18} color={me.ink2} />
              <Text style={styles.editButtonText}>Edit Quote</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Ionicons name='send-outline' size={18} color={me.onBrand} />
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
  container: { flex: 1, backgroundColor: me.bg2 },
  centered: { justifyContent: 'center', alignItems: 'center' },
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
  headerButton: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  scroll: { flex: 1 },
  statusCard: {
    margin: 16,
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 20,
    ...me.shadow.card,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: me.onBrand,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: me.ink,
  },
  projectTitle: {
    fontSize: 14,
    color: me.ink2,
    marginTop: 4,
  },
  section: {
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    ...me.shadow.card,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: me.ink,
  },
  detailText: { fontSize: 13, color: me.ink2, marginTop: 4 },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: { fontSize: 14, color: me.ink2 },
  detailValue: {
    fontSize: 14,
    color: me.ink,
    fontWeight: '600',
  },
  totalRowFinal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
    marginTop: 8,
    paddingTop: 12,
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
  notesText: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 20,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 4,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.bg2,
    borderRadius: 28,
    paddingVertical: 14,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.ink,
    borderRadius: 28,
    paddingVertical: 14,
    gap: 6,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: me.onBrand,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 16, color: me.ink2, marginTop: 16 },
  backLink: {
    fontSize: 14,
    color: me.ink,
    fontWeight: '600',
    marginTop: 12,
  },
});
