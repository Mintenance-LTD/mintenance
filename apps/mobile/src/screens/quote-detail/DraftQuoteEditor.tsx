import React, { useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  calculateDraftQuotePricing,
  type DraftQuotePricing,
} from '@mintenance/shared';
import type {
  ContractorQuote,
  UpdateQuoteData,
} from '../../services/quotes/types';
import { styles } from './quoteDetailStyles';
import { me } from '../../design-system/mint-editorial';

interface Props {
  quote: ContractorQuote;
  saving: boolean;
  onSave: (data: UpdateQuoteData) => Promise<void>;
  onCancel: () => void;
  onReload: () => void;
}

function decimal(text: string, places: number, label: string) {
  if (!new RegExp(`^\\d+(\\.\\d{0,${places}})?$`).test(text.trim())) {
    throw new Error(`Enter ${label} using up to ${places} decimal places.`);
  }
  return Number(text);
}

export function DraftQuoteEditor({
  quote,
  saving,
  onSave,
  onCancel,
  onReload,
}: Props) {
  const [title, setTitle] = useState(quote.project_title);
  const [clientName, setClientName] = useState(quote.client_name);
  const [pricingEnabled, setPricingEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState('');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [items, setItems] = useState(() =>
    (quote.line_items ?? []).map((item, index) => ({
      key: index,
      description: item.description ?? item.item_name ?? '',
      quantity: String(item.quantity ?? ''),
      unitPrice: String(item.unitPrice ?? item.unit_price ?? ''),
    }))
  );
  const nextKey = useRef(items.length);
  const canEditPrices = quote.pricing_edit_version === 1 && !!quote.updated_at;
  let pricing: DraftQuotePricing | undefined;
  let preview: ReturnType<typeof calculateDraftQuotePricing> | undefined;
  let validation = '';
  if (pricingEnabled) {
    try {
      pricing = {
        line_items: items.map((item) => ({
          description: item.description,
          quantity: decimal(item.quantity, 3, 'a quantity'),
          unitPrice: decimal(item.unitPrice, 2, 'a unit price'),
        })),
        tax_rate_percent: decimal(taxRate, 2, 'the applicable tax percentage'),
      };
      preview = calculateDraftQuotePricing(pricing);
    } catch (cause) {
      validation = cause instanceof Error ? cause.message : 'Check the prices.';
    }
  }
  const updateItem = (
    key: number,
    field: 'description' | 'quantity' | 'unitPrice',
    value: string
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    );
  };
  const save = async () => {
    if (saving || validation || conflict || !title.trim() || !clientName.trim())
      return;
    setError('');
    try {
      await onSave({
        expected_status: 'draft',
        ...(quote.updated_at ? { expected_updated_at: quote.updated_at } : {}),
        title: title.trim(),
        client_name: clientName.trim(),
        ...(pricingEnabled ? { pricing } : {}),
      });
    } catch (cause) {
      const stale = (cause as { statusCode?: number })?.statusCode === 409;
      setConflict(stale);
      setError(
        stale
          ? 'This quote changed elsewhere. Your edits are kept here for comparison. Reload the latest quote before editing again.'
          : 'Could not save quote. Your edits are kept here. Try saving again.'
      );
    }
  };
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>EDIT DRAFT</Text>
      <Text style={styles.detailLabel}>Quote title</Text>
      <TextInput
        accessibilityLabel='Quote title'
        value={title}
        onChangeText={setTitle}
        maxLength={255}
        editable={!saving}
        style={styles.editInput}
      />
      <Text style={styles.detailLabel}>Client name</Text>
      <TextInput
        accessibilityLabel='Client name'
        value={clientName}
        onChangeText={setClientName}
        maxLength={200}
        editable={!saving}
        style={styles.editInput}
      />
      {!pricingEnabled ? (
        <>
          <TouchableOpacity
            accessibilityRole='button'
            disabled={saving || !canEditPrices}
            style={styles.editorAction}
            onPress={() => {
              if (canEditPrices && !saving) setPricingEnabled(true);
            }}
          >
            <Text style={styles.backLink}>Edit prices and items</Text>
          </TouchableOpacity>
          {!canEditPrices && (
            <Text style={styles.detailText}>
              Price editing is unavailable. Reload the quote or try again later.
            </Text>
          )}
        </>
      ) : (
        <>
          <Text style={styles.detailText}>
            Current saved total: £{quote.total_amount.toFixed(2)}
          </Text>
          <Text style={styles.detailText}>
            Saving replaces this draft’s pricing with the breakdown below.
            Review every item, include any agreed adjustments in the unit
            prices, and enter the applicable tax percentage (0 for no tax).
          </Text>
          {items.map((item, index) => (
            <View key={item.key} style={styles.editorItem}>
              <Text style={styles.sectionTitle}>ITEM {index + 1}</Text>
              <Text style={styles.detailLabel}>Description</Text>
              <TextInput
                accessibilityLabel={`Item ${index + 1} description`}
                value={item.description}
                onChangeText={(text) =>
                  updateItem(item.key, 'description', text)
                }
                maxLength={500}
                multiline
                editable={!saving}
                style={styles.editInput}
              />
              <Text style={styles.detailLabel}>Quantity</Text>
              <TextInput
                accessibilityLabel={`Item ${index + 1} quantity`}
                value={item.quantity}
                onChangeText={(text) => updateItem(item.key, 'quantity', text)}
                keyboardType='decimal-pad'
                maxLength={20}
                editable={!saving}
                style={styles.editInput}
              />
              <Text style={styles.detailLabel}>Unit price (£, before tax)</Text>
              <TextInput
                accessibilityLabel={`Item ${index + 1} unit price`}
                value={item.unitPrice}
                onChangeText={(text) => updateItem(item.key, 'unitPrice', text)}
                keyboardType='decimal-pad'
                maxLength={20}
                editable={!saving}
                style={styles.editInput}
              />
              {preview?.line_items[index] && (
                <Text style={styles.detailText}>
                  Line total: £{preview.line_items[index].total.toFixed(2)}
                </Text>
              )}
              <TouchableOpacity
                accessibilityRole='button'
                accessibilityLabel={`Remove item ${index + 1}`}
                disabled={saving}
                style={styles.editorAction}
                onPress={() =>
                  setItems((current) =>
                    current.filter((row) => row.key !== item.key)
                  )
                }
              >
                <Text style={styles.backLink}>Remove item</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            accessibilityRole='button'
            disabled={saving || items.length >= 100}
            style={styles.editorAction}
            onPress={() => {
              const key = nextKey.current++;
              setItems((current) => [
                ...current,
                { key, description: '', quantity: '1', unitPrice: '' },
              ]);
            }}
          >
            <Text style={styles.backLink}>Add item</Text>
          </TouchableOpacity>
          <Text style={styles.detailLabel}>Tax (%)</Text>
          <TextInput
            accessibilityLabel='Tax percentage'
            value={taxRate}
            onChangeText={setTaxRate}
            keyboardType='decimal-pad'
            maxLength={6}
            editable={!saving}
            style={styles.editInput}
          />
          {validation ? (
            <Text
              accessibilityRole='alert'
              style={[styles.detailText, { color: me.errFg }]}
            >
              {validation}
            </Text>
          ) : null}
          {preview && (
            <View accessibilityLiveRegion='polite'>
              <Text style={styles.detailText}>
                New subtotal: £{preview.subtotal.toFixed(2)}
              </Text>
              <Text style={styles.detailText}>
                New tax: £{preview.tax_amount.toFixed(2)}
              </Text>
              <Text style={styles.grandTotalLabel}>
                New total: £{preview.total_amount.toFixed(2)}
              </Text>
            </View>
          )}
          <TouchableOpacity
            accessibilityRole='button'
            disabled={saving}
            style={styles.editorAction}
            onPress={() => setPricingEnabled(false)}
          >
            <Text style={styles.backLink}>Keep saved pricing</Text>
          </TouchableOpacity>
        </>
      )}
      {error ? (
        <Text
          accessibilityRole='alert'
          style={[styles.detailText, { color: me.errFg }]}
        >
          {error}
        </Text>
      ) : null}
      {conflict && (
        <TouchableOpacity
          accessibilityRole='button'
          onPress={onReload}
          style={styles.editorAction}
        >
          <Text style={styles.backLink}>Discard edits and reload</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        accessibilityRole='button'
        style={styles.editorAction}
        disabled={
          saving ||
          !!validation ||
          conflict ||
          !title.trim() ||
          !clientName.trim()
        }
        onPress={save}
      >
        <Text style={styles.backLink}>
          {saving ? 'Saving…' : pricingEnabled ? 'Save quote' : 'Save details'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole='button'
        disabled={saving}
        onPress={onCancel}
        style={styles.editorAction}
      >
        <Text style={styles.backLink}>Cancel editing</Text>
      </TouchableOpacity>
    </View>
  );
}
