import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { LineItem } from '../viewmodels/CreateQuoteViewModel';
import { me } from '../../../design-system/mint-editorial';

export function QuoteItemEditor({
  item,
  onSave,
  onCancel,
}: {
  item?: LineItem;
  onSave: (item: LineItem) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item?.item_name ?? '');
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [price, setPrice] = useState(item ? String(item.unit_price) : '');
  const valid =
    name.trim().length > 0 &&
    Number.isFinite(Number(quantity)) &&
    Number(quantity) > 0 &&
    price.trim().length > 0 &&
    Number.isFinite(Number(price)) &&
    Number(price) >= 0;
  return (
    <Modal transparent animationType='slide' onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 20,
          backgroundColor: '#00000066',
        }}
      >
        <View
          style={{
            backgroundColor: me.surface,
            borderRadius: 24,
            padding: 20,
            maxHeight: '90%',
          }}
        >
          <ScrollView keyboardShouldPersistTaps='handled'>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: me.ink,
                marginBottom: 16,
              }}
            >
              {item ? 'Edit line item' : 'Add line item'}
            </Text>
            {[
              {
                label: 'Item description',
                value: name,
                change: setName,
                numeric: false,
              },
              {
                label: 'Quantity',
                value: quantity,
                change: setQuantity,
                numeric: true,
              },
              {
                label: 'Unit price (£)',
                value: price,
                change: setPrice,
                numeric: true,
              },
            ].map((field) => (
              <View key={field.label} style={{ marginBottom: 16 }}>
                <Text style={{ color: me.ink2, marginBottom: 6 }}>
                  {field.label}
                </Text>
                <TextInput
                  accessibilityLabel={field.label}
                  value={field.value}
                  onChangeText={field.change}
                  keyboardType={field.numeric ? 'decimal-pad' : 'default'}
                  style={{
                    minHeight: 48,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: me.line,
                    borderRadius: 12,
                    color: me.ink,
                  }}
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                accessibilityRole='button'
                onPress={onCancel}
                style={{ padding: 14, flex: 1 }}
              >
                <Text style={{ color: me.ink, textAlign: 'center' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole='button'
                disabled={!valid}
                accessibilityState={{ disabled: !valid }}
                style={{
                  backgroundColor: me.brand,
                  opacity: valid ? 1 : 0.4,
                  padding: 14,
                  borderRadius: 12,
                  flex: 1,
                }}
                onPress={() => {
                  if (!valid) return;
                  onSave({
                    ...item,
                    item_name: name.trim(),
                    item_description: item?.item_description ?? '',
                    quantity: Number(quantity),
                    unit_price: Number(price),
                    unit: item?.unit ?? 'unit',
                    category: item?.category ?? 'labour',
                    is_taxable: item?.is_taxable ?? true,
                    sort_order: item?.sort_order ?? 0,
                  });
                }}
              >
                <Text
                  style={{
                    color: me.onBrand,
                    textAlign: 'center',
                    fontWeight: '700',
                  }}
                >
                  Save item
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
