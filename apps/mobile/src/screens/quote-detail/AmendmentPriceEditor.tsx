import React, { useRef, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import {
  calculateDraftQuotePricing,
  type DraftQuotePricing,
} from '@mintenance/shared';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import {
  prepareQuoteAmendment,
  type AmendmentSource,
  type AmendmentProposalInput,
} from '../../services/quotes/QuoteAmendmentPreparation';
import type { QuoteRevision } from '../../services/quotes/types';
import { amendmentStyles as s } from './amendmentPreparationStyles';

export function PreparationAction({
  title,
  disabled = false,
  onPress,
}: {
  title: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole='button'
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        if (!disabled) onPress();
      }}
      style={s.button}
    >
      <Text style={s.text}>{title}</Text>
    </TouchableOpacity>
  );
}
function decimal(text: string, places: number, label: string) {
  if (!new RegExp(`^\\d+(\\.\\d{0,${places}})?$`).test(text.trim()))
    throw new Error(`Enter ${label} using up to ${places} decimal places.`);
  return Number(text);
}
export function AmendmentPriceEditor({
  source,
  onSaved,
  onCancel,
  onReload,
}: {
  source: AmendmentSource;
  onSaved: (revision: QuoteRevision) => void;
  onCancel: () => void;
  onReload: () => void;
}) {
  const [reason, setReason] = useState(''),
    [tax, setTax] = useState(''),
    [dirty, setDirty] = useState(false);
  const [items, setItems] = useState(() =>
    (source.quote.line_items ?? []).map((item, key) => ({
      key,
      description: item.description ?? item.item_name ?? '',
      quantity: String(item.quantity ?? ''),
      unitPrice: String(item.unitPrice ?? item.unit_price ?? ''),
    }))
  );
  const nextKey = useRef(items.length),
    lock = useRef(false),
    pending = useRef<AmendmentProposalInput | null>(null);
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [blocked, setBlocked] = useState(false),
    [error, setError] = useState('');
  const navigation = useNavigation();
  usePreventRemove(dirty || uncertain || busy, ({ data }) => {
    if (lock.current) {
      Alert.alert(
        'Saving proposal',
        'Wait for the save result before leaving.'
      );
      return;
    }
    Alert.alert(
      'Leave amendment preparation?',
      uncertain
        ? 'The proposal may already be saved. Check recorded history when you return before preparing another.'
        : 'Your unsaved price edits will be discarded.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => navigation.dispatch(data.action),
        },
      ]
    );
  });
  let pricing: DraftQuotePricing | undefined,
    preview: ReturnType<typeof calculateDraftQuotePricing> | undefined,
    invalid = '';
  try {
    pricing = {
      line_items: items.map((item) => ({
        description: item.description,
        quantity: decimal(item.quantity, 3, 'a quantity'),
        unitPrice: decimal(item.unitPrice, 2, 'a unit price'),
      })),
      tax_rate_percent: decimal(tax, 2, 'the applicable tax percentage'),
    };
    preview = calculateDraftQuotePricing(pricing);
    if (preview.total_amount <= 0)
      invalid =
        'The proposed total must be greater than zero for customer review.';
  } catch (err) {
    invalid = err instanceof Error ? err.message : 'Check the proposed prices.';
  }
  const disabled = busy || uncertain || blocked;
  const save = async () => {
    if (
      lock.current ||
      blocked ||
      (!pending.current && (invalid || !reason.trim() || !pricing))
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (!pending.current)
        pending.current = {
          request_id: Crypto.randomUUID(),
          expected_updated_at: source.quote.updated_at,
          reason: reason.trim(),
          pricing: pricing!,
        };
      const revision = await prepareQuoteAmendment(
        source.quote.id,
        pending.current
      );
      pending.current = null;
      setUncertain(false);
      setDirty(false);
      onSaved(revision);
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode;
      // Only definite validation/access/conflict responses release the retry body.
      if (status && [400, 401, 403, 404, 409].includes(status)) {
        pending.current = null;
        setBlocked(true);
        setUncertain(false);
      } else setUncertain(Boolean(pending.current));
      setError(
        err instanceof Error
          ? err.message
          : 'Could not confirm the proposal. Retry the same request or reload history.'
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const discard = (reload = false) => {
    if (lock.current) return;
    if (!dirty && !uncertain && !blocked) {
      onCancel();
      return;
    }
    Alert.alert(
      'Discard local edits?',
      uncertain
        ? 'The proposal may already be saved. Reload history to check before preparing another.'
        : 'Your unsaved price edits will be discarded.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text:
            reload || uncertain || blocked
              ? 'Discard and reload'
              : 'Discard edits',
          style: 'destructive',
          onPress: reload || uncertain || blocked ? onReload : onCancel,
        },
      ]
    );
  };
  const update = (
    key: number,
    field: 'description' | 'quantity' | 'unitPrice',
    value: string
  ) => {
    if (disabled) return;
    setDirty(true);
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    );
  };
  return (
    <View style={s.card}>
      <Text style={s.heading}>Prepare amendment proposal</Text>
      <Text style={s.text}>
        Saving records a separate proposal. The accepted quote, contract and
        payments stay unchanged. Publishing for customer review is a separate
        step.
      </Text>
      <Text style={s.text}>
        Review every item and include agreed adjustments in the unit prices.
        Enter the applicable tax percentage explicitly (0 for no tax).
      </Text>
      <Text style={s.text}>Reason for amendment</Text>
      <TextInput
        accessibilityLabel='Reason for amendment'
        value={reason}
        maxLength={2000}
        multiline
        editable={!disabled}
        style={s.input}
        onChangeText={(value) => {
          if (!disabled) {
            setDirty(true);
            setReason(value);
          }
        }}
      />
      {items.map((item, index) => (
        <View key={item.key} style={s.card}>
          <Text style={s.heading}>Item {index + 1}</Text>
          <Text style={s.text}>Description</Text>
          <TextInput
            accessibilityLabel={`Item ${index + 1} description`}
            value={item.description}
            onChangeText={(v) => update(item.key, 'description', v)}
            maxLength={500}
            multiline
            editable={!disabled}
            style={s.input}
          />
          <Text style={s.text}>Quantity</Text>
          <TextInput
            accessibilityLabel={`Item ${index + 1} quantity`}
            value={item.quantity}
            onChangeText={(v) => update(item.key, 'quantity', v)}
            maxLength={20}
            keyboardType='decimal-pad'
            editable={!disabled}
            style={s.input}
          />
          <Text style={s.text}>Unit price (£ before tax)</Text>
          <TextInput
            accessibilityLabel={`Item ${index + 1} unit price`}
            value={item.unitPrice}
            onChangeText={(v) => update(item.key, 'unitPrice', v)}
            maxLength={20}
            keyboardType='decimal-pad'
            editable={!disabled}
            style={s.input}
          />
          {preview?.line_items[index] && (
            <Text style={s.text}>
              Line total: £{preview.line_items[index].total.toFixed(2)}
            </Text>
          )}
          <PreparationAction
            title={`Remove item ${index + 1}`}
            disabled={disabled}
            onPress={() => {
              setDirty(true);
              setItems((current) =>
                current.filter((row) => row.key !== item.key)
              );
            }}
          />
        </View>
      ))}
      <PreparationAction
        title='Add item'
        disabled={disabled || items.length >= 100}
        onPress={() => {
          const key = nextKey.current++;
          setDirty(true);
          setItems((current) => [
            ...current,
            { key, description: '', quantity: '1', unitPrice: '' },
          ]);
        }}
      />
      <Text style={s.text}>Tax (%)</Text>
      <TextInput
        accessibilityLabel='Tax percentage'
        value={tax}
        onChangeText={(v) => {
          if (!disabled) {
            setDirty(true);
            setTax(v);
          }
        }}
        maxLength={6}
        keyboardType='decimal-pad'
        editable={!disabled}
        style={s.input}
      />
      {!!invalid && (
        <Text accessibilityRole='alert' style={s.error}>
          {invalid}
        </Text>
      )}
      {preview && (
        <View accessibilityLiveRegion='polite'>
          <Text style={s.text}>
            Proposed subtotal: £{preview.subtotal.toFixed(2)}
          </Text>
          <Text style={s.text}>
            Proposed tax: £{preview.tax_amount.toFixed(2)}
          </Text>
          <Text style={s.heading}>
            Proposed total: £{preview.total_amount.toFixed(2)}
          </Text>
        </View>
      )}
      {!!error && (
        <Text accessibilityRole='alert' style={s.error}>
          {error}
        </Text>
      )}
      {uncertain && (
        <Text style={s.text}>
          The outcome is uncertain. Retry keeps the exact request and prevents a
          duplicate proposal.
        </Text>
      )}
      {blocked && (
        <Text style={s.text}>
          Reload the current quote and history before preparing another
          proposal.
        </Text>
      )}
      <PreparationAction
        title={
          busy
            ? 'Saving proposal…'
            : uncertain
              ? 'Retry same proposal'
              : 'Save proposal'
        }
        disabled={
          busy || blocked || (!uncertain && (!!invalid || !reason.trim()))
        }
        onPress={() => void save()}
      />
      <PreparationAction
        title={
          blocked || uncertain
            ? 'Discard edits and reload history'
            : 'Cancel editing'
        }
        disabled={busy}
        onPress={() => discard(blocked || uncertain)}
      />
    </View>
  );
}
