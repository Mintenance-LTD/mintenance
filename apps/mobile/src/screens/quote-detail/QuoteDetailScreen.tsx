import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
import { styles } from './quoteDetailStyles';

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
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const requestVersion = useRef(0);

  const loadQuote = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoadError(false);
    setLoading(true);
    setQuote(null);
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const quotes = await QuoteBuilderService.getQuotes(user.id);
      if (version !== requestVersion.current) return;
      setQuote(quotes.find((q) => q.id === quoteId) ?? null);
    } catch {
      if (version === requestVersion.current) setLoadError(true);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [quoteId, user?.id]);

  useEffect(() => {
    setEditing(false);
    void loadQuote();
    const versionRef = requestVersion;
    return () => {
      versionRef.current++;
    };
  }, [loadQuote]);

  const startEditing = () => {
    if (quote?.status !== 'draft') return;
    setTitle(quote.project_title);
    setClientName(quote.client_name);
    setEditing(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };
  const saveDetails = async () => {
    if (
      !quote ||
      quote.status !== 'draft' ||
      saveLock.current ||
      !title.trim() ||
      !clientName.trim()
    )
      return;
    saveLock.current = true;
    setSaving(true);
    try {
      const saved = await QuoteBuilderService.updateQuote(quote.id, {
        expected_status: 'draft',
        title: title.trim(),
        client_name: clientName.trim(),
      });
      if (saved?.id !== quote.id)
        throw new Error('Quote update could not be confirmed');
      setEditing(false);
      await loadQuote();
      toast.success('Quote details saved');
    } catch {
      toast.error('Could not save quote details. Your edits are kept here.');
    } finally {
      saveLock.current = false;
      setSaving(false);
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

  if (loading) return <LoadingSpinner message='Loading quote…' />;

  if (!quote) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name='document-outline' size={32} color={me.ink3} />
        </View>
        <Text style={styles.emptyText}>
          {loadError ? 'Could not load quote' : 'Quote not found'}
        </Text>
        {loadError && (
          <TouchableOpacity accessibilityRole='button' onPress={loadQuote}>
            <Text style={styles.backLink}>Retry loading quote</Text>
          </TouchableOpacity>
        )}
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
        <Text style={styles.headerTitle}>
          Quote #{quote.quote_number || quote.id.slice(0, 8).toUpperCase()}
        </Text>
        {quote.status === 'draft' && !editing && (
          <TouchableOpacity
            accessibilityRole='button'
            accessibilityLabel='Edit quote details'
            style={styles.headerButton}
            onPress={startEditing}
          >
            <Ionicons name='pencil' size={22} color={me.ink} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='on-drag'
          showsVerticalScrollIndicator={false}
        >
          {editing && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>EDIT DRAFT DETAILS</Text>
              <TextInput
                accessibilityLabel='Quote title'
                value={title}
                onChangeText={setTitle}
                maxLength={500}
                editable={!saving}
                style={styles.editInput}
              />
              <TextInput
                accessibilityLabel='Client name'
                value={clientName}
                onChangeText={setClientName}
                maxLength={200}
                editable={!saving}
                style={styles.editInput}
              />
              <Text style={styles.detailText}>
                This edits the draft title and client name. Pricing and line
                items remain as quoted.
              </Text>
              <TouchableOpacity
                accessibilityRole='button'
                disabled={saving || !title.trim() || !clientName.trim()}
                onPress={saveDetails}
              >
                <Text style={styles.backLink}>
                  {saving ? 'Saving…' : 'Save details'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole='button'
                disabled={saving}
                onPress={() => setEditing(false)}
              >
                <Text style={styles.backLink}>Cancel editing</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            >
              <Text style={styles.statusText}>
                {quote.status.toUpperCase()}
              </Text>
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LINE ITEMS</Text>
            {quote.line_items?.length ? (
              quote.line_items.map((item, index) => (
                <View key={index} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { flex: 1 }]}>
                    {item.description || item.item_name || 'Item'} ·{' '}
                    {item.quantity} × £
                    {Number(item.unitPrice ?? item.unit_price ?? 0).toFixed(2)}
                  </Text>
                  <Text style={styles.detailValue}>
                    £
                    {Number(
                      item.total ??
                        item.subtotal ??
                        item.quantity * (item.unitPrice ?? item.unit_price ?? 0)
                    ).toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.detailText}>
                No line-item breakdown recorded.
              </Text>
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
              <Text style={styles.detailLabel}>Tax</Text>
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
                onPress={startEditing}
              >
                <Ionicons name='pencil-outline' size={18} color={me.ink2} />
                <Text style={styles.editButtonText}>Edit details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                <Ionicons name='send-outline' size={18} color={me.onBrand} />
                <Text style={styles.sendButtonText}>Send to Client</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
