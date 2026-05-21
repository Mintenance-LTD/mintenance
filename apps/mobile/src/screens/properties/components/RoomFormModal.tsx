/**
 * RoomFormModal — Add / Edit room (mobile)
 *
 * Size is optional. Parent maps empty string → null before sending
 * to the DB so we never store a fabricated size.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import type { RoomType } from './PropertyRoomsSection';

export interface RoomFormValues {
  name: string;
  room_type: RoomType;
  size_sqm: string;
  notes: string;
}

const ROOM_TYPE_OPTIONS: Array<{ value: RoomType; label: string }> = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'living_room', label: 'Living room' },
  { value: 'dining_room', label: 'Dining room' },
  { value: 'hallway', label: 'Hallway' },
  { value: 'office', label: 'Office' },
  { value: 'utility', label: 'Utility' },
  { value: 'garage', label: 'Garage' },
  { value: 'garden', label: 'Garden' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'roof', label: 'Roof' },
  { value: 'other', label: 'Other' },
];

const DEFAULTS: RoomFormValues = {
  name: '',
  room_type: 'kitchen',
  size_sqm: '',
  notes: '',
};

interface RoomFormModalProps {
  visible: boolean;
  initial?: RoomFormValues;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: RoomFormValues) => void;
}

export const RoomFormModal: React.FC<RoomFormModalProps> = ({
  visible,
  initial,
  saving,
  onCancel,
  onSubmit,
}) => {
  const [values, setValues] = useState<RoomFormValues>(initial ?? DEFAULTS);
  const [touched, setTouched] = useState(false);

  // Reset state when initial changes
  React.useEffect(() => {
    setValues(initial ?? DEFAULTS);
    setTouched(false);
  }, [initial]);

  const nameError =
    touched && values.name.trim().length === 0 ? 'Name is required' : null;
  const sizeError =
    touched &&
    values.size_sqm !== '' &&
    (Number.isNaN(Number(values.size_sqm)) || Number(values.size_sqm) < 0)
      ? 'Size must be a positive number'
      : null;

  const handleSubmit = () => {
    setTouched(true);
    if (values.name.trim().length === 0) return;
    if (sizeError) return;
    onSubmit(values);
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {initial ? 'Edit room' : 'Add a room'}
            </Text>
            <TouchableOpacity
              onPress={onCancel}
              accessibilityLabel='Close'
              style={styles.closeBtn}
            >
              <Ionicons name='close' size={20} color={me.ink3} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {/* Name */}
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={values.name}
              onChangeText={(t) => setValues({ ...values, name: t })}
              placeholder='e.g. Master bedroom'
              placeholderTextColor={me.ink4}
              maxLength={80}
              style={[
                styles.input,
                nameError ? styles.inputError : undefined,
              ]}
            />
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : null}

            {/* Type — horizontal chip selector */}
            <Text style={[styles.label, { marginTop: 14 }]}>Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {ROOM_TYPE_OPTIONS.map((opt) => {
                const active = values.room_type === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() =>
                      setValues({ ...values, room_type: opt.value })
                    }
                    style={[
                      styles.chip,
                      active ? styles.chipActive : undefined,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active ? styles.chipTextActive : undefined,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Size */}
            <Text style={[styles.label, { marginTop: 14 }]}>
              Size in m² <Text style={styles.labelHint}>(optional)</Text>
            </Text>
            <TextInput
              value={values.size_sqm}
              onChangeText={(t) => setValues({ ...values, size_sqm: t })}
              placeholder='e.g. 12.5'
              placeholderTextColor={me.ink4}
              keyboardType='decimal-pad'
              style={[
                styles.input,
                sizeError ? styles.inputError : undefined,
              ]}
            />
            {sizeError ? (
              <Text style={styles.errorText}>{sizeError}</Text>
            ) : (
              <Text style={styles.hint}>
                Leave blank if you don&rsquo;t know.
              </Text>
            )}

            {/* Notes */}
            <Text style={[styles.label, { marginTop: 14 }]}>
              Notes <Text style={styles.labelHint}>(optional)</Text>
            </Text>
            <TextInput
              value={values.notes}
              onChangeText={(t) => setValues({ ...values, notes: t })}
              placeholder='Anything worth flagging…'
              placeholderTextColor={me.ink4}
              multiline
              maxLength={500}
              style={[styles.input, styles.textarea]}
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={onCancel}
              disabled={saving}
              style={[styles.btn, styles.btnSecondary]}
            >
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              style={[
                styles.btn,
                styles.btnPrimary,
                saving ? { opacity: 0.7 } : undefined,
              ]}
            >
              <Text style={styles.btnPrimaryText}>
                {saving ? 'Saving…' : initial ? 'Save changes' : 'Add room'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // Solid-ink translucent backdrop; mobile palette doesn't yet expose
    // a named overlay token, so use rgba(ink, .5) inline.
    backgroundColor: 'rgba(26, 37, 32, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: me.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  closeBtn: { padding: 6 },
  body: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink2,
    marginBottom: 6,
  },
  labelHint: {
    fontWeight: '400',
    color: me.ink3,
  },
  input: {
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: me.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: me.ink,
  },
  inputError: {
    borderColor: me.errFg,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: me.errFg,
  },
  hint: {
    marginTop: 4,
    fontSize: 11,
    color: me.ink3,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: me.line,
    backgroundColor: me.surface,
  },
  chipActive: {
    backgroundColor: me.brand,
    borderColor: me.brand,
  },
  chipText: {
    fontSize: 12,
    color: me.ink2,
    fontWeight: '600',
  },
  chipTextActive: { color: me.onBrand },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: me.radius.btn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: me.brand,
  },
  btnPrimaryText: {
    color: me.onBrand,
    fontWeight: '700',
    fontSize: 14,
  },
  btnSecondary: {
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
  },
  btnSecondaryText: {
    color: me.ink2,
    fontWeight: '600',
    fontSize: 14,
  },
});
