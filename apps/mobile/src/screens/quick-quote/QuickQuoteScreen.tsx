/**
 * QuickQuoteScreen — Mint Editorial walk-up estimate builder.
 *
 * Streamlined sibling of CreateQuoteScreen for the on-site moment:
 * line items + auto-calculated VAT + a single customer field. The
 * detailed CreateQuote covers everything else (templates, terms,
 * markup, discount, notes); this one is gloves-on-and-in-a-hurry.
 *
 * Posts to `POST /api/contractor/quotes` with the same shape — the
 * `quantity: 1, unitPrice: amount` shape lets a single-amount line
 * item map cleanly onto the existing schema.
 *
 * Reference: redesign-v2 / contractor-mobile-audit.html, screen 10
 * "Quick quote". Voice: amount-led, two-button footer
 * ("Save draft" / "Send · charge in app"), Mint Editorial palette,
 * serif `Total` headline.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { useToast } from '../../components/ui/Toast';
import { logger } from '../../utils/logger';
import { styles } from './styles';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'QuickQuote'>;

interface LineItem {
  id: string;
  description: string;
  amount: string; // string so the input can hold partial values like "10."
}

const VAT_RATE = 0.2;

const parseAmount = (raw: string): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const fmtGBP = (n: number): string =>
  `£${n.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const newRow = (): LineItem => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  description: '',
  amount: '',
});

interface Props {
  navigation: Nav;
  route: {
    params?: {
      jobId?: string;
      clientName?: string;
      clientPhone?: string;
    };
  };
}

export const QuickQuoteScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const initialCustomer =
    route.params?.clientName && route.params?.clientPhone
      ? `${route.params.clientName} · ${route.params.clientPhone}`
      : (route.params?.clientName ?? '');

  const [items, setItems] = useState<LineItem[]>([
    newRow(),
    newRow(),
    newRow(),
  ]);
  const [customer, setCustomer] = useState(initialCustomer);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + parseAmount(it.amount), 0),
    [items]
  );
  const vat = useMemo(
    () => Math.round(subtotal * VAT_RATE * 100) / 100,
    [subtotal]
  );
  const total = useMemo(
    () => Math.round((subtotal + vat) * 100) / 100,
    [subtotal, vat]
  );

  const filledCount = items.filter(
    (i) => i.description.trim() && parseAmount(i.amount) > 0
  ).length;

  const updateItem = useCallback(
    (id: string, patch: Partial<LineItem>) =>
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
      ),
    []
  );

  const addItem = useCallback(
    () => setItems((prev) => [...prev, newRow()]),
    []
  );

  const removeItem = useCallback(
    (id: string) =>
      setItems((prev) =>
        prev.length > 1 ? prev.filter((i) => i.id !== id) : prev
      ),
    []
  );

  // Split "Name · Phone" or fall back to whole-string-as-name. Phones in
  // the design are dot-separated by ' · ' which we treat as authoritative;
  // when no separator, the whole input is the name.
  const splitCustomer = useCallback(
    (raw: string): { name: string; phone?: string } => {
      const trimmed = raw.trim();
      if (!trimmed) return { name: '' };
      const sep = trimmed.lastIndexOf('·');
      if (sep === -1) return { name: trimmed };
      const name = trimmed.slice(0, sep).trim();
      const phone = trimmed.slice(sep + 1).trim();
      return { name: name || trimmed, phone: phone || undefined };
    },
    []
  );

  const buildPayload = useCallback(
    (status: 'draft' | 'send') => {
      const validItems = items.filter(
        (i) => i.description.trim() && parseAmount(i.amount) > 0
      );
      const { name, phone } = splitCustomer(customer);
      const lineItems = validItems.map((i) => ({
        description: i.description.trim(),
        quantity: 1,
        unitPrice: parseAmount(i.amount),
        total: parseAmount(i.amount),
      }));
      const subtotalAmt = lineItems.reduce((s, l) => s + l.total, 0);
      const vatAmt = Math.round(subtotalAmt * VAT_RATE * 100) / 100;
      const totalAmt = Math.round((subtotalAmt + vatAmt) * 100) / 100;
      return {
        title: validItems[0]?.description?.slice(0, 200) || 'Walk-up estimate',
        clientName: name || 'Walk-up customer',
        clientPhone: phone,
        lineItems,
        subtotal: subtotalAmt,
        taxRate: VAT_RATE * 100,
        taxAmount: vatAmt,
        totalAmount: totalAmt,
        notes: status === 'send' ? 'Sent from on-site quick quote.' : undefined,
      };
    },
    [items, customer, splitCustomer]
  );

  const saveMutation = useMutation({
    mutationFn: async (status: 'draft' | 'send') => {
      const payload = buildPayload(status);
      if (payload.lineItems.length === 0) {
        throw new Error('Add at least one line item before saving.');
      }
      // POST /api/contractor/quotes — same endpoint the full
      // CreateQuoteScreen uses. status defaults to 'draft' server-side.
      const res = await mobileApiClient.post<{
        quote: { id: string; quote_number?: string };
      }>('/api/contractor/quotes', payload);
      return { quote: res.quote, status };
    },
    onSuccess: ({ status }) => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(
        status === 'send' ? 'Quote saved and ready to send.' : 'Draft saved.'
      );
      navigation.goBack();
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Could not save quote.';
      logger.warn('Quick quote save failed', { error: msg });
      Alert.alert('Save failed', msg);
    },
  });

  const canSave = filledCount > 0 && customer.trim().length > 0;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole='button'
            accessibilityLabel='Go back'
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name='arrow-back' size={22} color={me.ink} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Quick quote</Text>
            <Text style={styles.headerSubtitle}>
              On-site walk-up estimate. Saves to your customer’s job thread.
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.itemsCard}>
            <Text style={styles.sectionEyebrow}>
              Line items · {filledCount}
            </Text>
            {items.map((item, idx) => (
              <View
                key={item.id}
                style={[styles.itemRow, idx > 0 && styles.itemRowBorder]}
              >
                <TextInput
                  style={styles.itemLabel}
                  value={item.description}
                  onChangeText={(t) => updateItem(item.id, { description: t })}
                  placeholder='e.g. Boiler service · 1.5 hr'
                  placeholderTextColor={me.ink3}
                  returnKeyType='next'
                  accessibilityLabel={`Line item ${idx + 1} description`}
                />
                <View style={styles.itemAmountWrap}>
                  <Text style={styles.itemAmountPrefix}>£</Text>
                  <TextInput
                    style={styles.itemAmount}
                    value={item.amount}
                    onChangeText={(t) =>
                      updateItem(item.id, {
                        amount: t.replace(/[^0-9.]/g, ''),
                      })
                    }
                    keyboardType='decimal-pad'
                    placeholder='0'
                    placeholderTextColor={me.ink3}
                    accessibilityLabel={`Line item ${idx + 1} amount`}
                  />
                </View>
                {items.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeItem(item.id)}
                    accessibilityRole='button'
                    accessibilityLabel={`Remove line item ${idx + 1}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name='close' size={16} color={me.ink3} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={addItem}
              accessibilityRole='button'
              accessibilityLabel='Add line item'
            >
              <Text style={styles.addBtnText}>+ Add item</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.totalsRow}>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{fmtGBP(subtotal)}</Text>
            </View>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>+ VAT 20%</Text>
              <Text style={styles.totalValue}>{fmtGBP(vat)}</Text>
            </View>
            <View style={[styles.totalCard, styles.totalCardDark]}>
              <Text style={[styles.totalLabel, styles.totalLabelDark]}>
                Total
              </Text>
              <Text style={[styles.totalValue, styles.totalValueDark]}>
                {fmtGBP(total)}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionEyebrow}>Customer</Text>
          <TextInput
            style={styles.customerInput}
            value={customer}
            onChangeText={setCustomer}
            placeholder='Name · 07700 900000'
            placeholderTextColor={me.ink3}
            autoCapitalize='words'
            accessibilityLabel='Customer name and phone'
          />
          <Text style={styles.customerHint}>
            Separate name and phone with “ · ” so we can save them to the job
            thread.
          </Text>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <TouchableOpacity
            style={[styles.btnSecondary, !canSave && styles.btnDisabled]}
            disabled={!canSave || saveMutation.isPending}
            onPress={() => saveMutation.mutate('draft')}
            accessibilityRole='button'
            accessibilityLabel='Save draft'
          >
            <Text
              style={[
                styles.btnSecondaryText,
                !canSave && styles.btnDisabledText,
              ]}
            >
              Save draft
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnPrimary, !canSave && styles.btnDisabled]}
            disabled={!canSave || saveMutation.isPending}
            onPress={() => saveMutation.mutate('send')}
            accessibilityRole='button'
            accessibilityLabel='Send and charge in app'
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color={me.onBrand} />
            ) : (
              <Text style={styles.btnPrimaryText}>Send · charge in app</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default QuickQuoteScreen;
