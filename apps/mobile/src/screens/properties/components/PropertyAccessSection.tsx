/**
 * PropertyAccessSection — homeowner-side editor for the "Access &
 * contacts" subset of a property (access mode, lock-box code,
 * notes, stopcock/gas/consumer-unit locations).
 *
 * 2026-05-23 audit: mobile previously had no way to set any of these
 * fields. PropertyDetailScreen only had overview / maintenance /
 * manage tabs, and EditPropertyScreen PATCHes basic property fields
 * (name / address / bedrooms) but not access info. This component
 * fills that gap, wired to PATCH /api/properties/[id]/access (the
 * same endpoint the web Mint Editorial Access view uses).
 *
 * Sensitivity:
 *   - `key_safe_code` is the most sensitive field. Server logs
 *     touched-fields list but never the value; mobile follows the
 *     same rule (no console.log of code values, no Sentry breadcrumb
 *     containing the field).
 *   - On save, we PATCH only the dirty fields — undefined leaves
 *     the existing value intact, explicit empty string clears it.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { me } from '../../../design-system/mint-editorial';

type AccessMode = 'key_safe' | 'smart_lock' | 'in_person';

interface PropertyAccess {
  access_mode: AccessMode | null;
  key_safe_code: string | null;
  access_notes: string | null;
  stopcock_location: string | null;
  gas_isolator_location: string | null;
  consumer_unit_location: string | null;
}

interface Props {
  propertyId: string;
  initial: Partial<PropertyAccess>;
}

const MODES: Array<{ key: AccessMode; label: string; sub: string }> = [
  {
    key: 'key_safe',
    label: 'Key safe',
    sub: 'Code reveals to the contractor 1 hour before their visit.',
  },
  {
    key: 'smart_lock',
    label: 'Smart lock',
    // 2026-05-23 audit: per-contractor one-time-code feature isn't
    // built yet (no smart_lock_codes table / generation service).
    // Until it ships, smart-lock mode just means "instructions only".
    sub: 'Instructions only — full integration coming soon.',
  },
  {
    key: 'in_person',
    label: "You'll be home",
    sub: 'Default — coordinate via the in-app chat.',
  },
];

export const PropertyAccessSection: React.FC<Props> = ({
  propertyId,
  initial,
}) => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<AccessMode | null>(
    (initial.access_mode as AccessMode | null) ?? null
  );
  const [code, setCode] = useState<string>(initial.key_safe_code ?? '');
  const [notes, setNotes] = useState<string>(initial.access_notes ?? '');
  const [stopcock, setStopcock] = useState<string>(
    initial.stopcock_location ?? ''
  );
  const [gas, setGas] = useState<string>(initial.gas_isolator_location ?? '');
  const [consumer, setConsumer] = useState<string>(
    initial.consumer_unit_location ?? ''
  );

  // Track the original snapshot so save can PATCH only the dirty
  // fields. Re-syncs when `initial` changes (e.g. after a refetch).
  const baseline = useMemo(
    () => ({
      access_mode: initial.access_mode ?? null,
      key_safe_code: initial.key_safe_code ?? '',
      access_notes: initial.access_notes ?? '',
      stopcock_location: initial.stopcock_location ?? '',
      gas_isolator_location: initial.gas_isolator_location ?? '',
      consumer_unit_location: initial.consumer_unit_location ?? '',
    }),
    [initial]
  );

  useEffect(() => {
    setMode((baseline.access_mode as AccessMode | null) ?? null);
    setCode(baseline.key_safe_code as string);
    setNotes(baseline.access_notes as string);
    setStopcock(baseline.stopcock_location as string);
    setGas(baseline.gas_isolator_location as string);
    setConsumer(baseline.consumer_unit_location as string);
  }, [baseline]);

  const isDirty =
    mode !== baseline.access_mode ||
    code !== baseline.key_safe_code ||
    notes !== baseline.access_notes ||
    stopcock !== baseline.stopcock_location ||
    gas !== baseline.gas_isolator_location ||
    consumer !== baseline.consumer_unit_location;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      if (mode !== baseline.access_mode) payload.access_mode = mode;
      if (code !== baseline.key_safe_code)
        payload.key_safe_code = code.trim() === '' ? null : code.trim();
      if (notes !== baseline.access_notes)
        payload.access_notes = notes.trim() === '' ? null : notes.trim();
      if (stopcock !== baseline.stopcock_location)
        payload.stopcock_location =
          stopcock.trim() === '' ? null : stopcock.trim();
      if (gas !== baseline.gas_isolator_location)
        payload.gas_isolator_location = gas.trim() === '' ? null : gas.trim();
      if (consumer !== baseline.consumer_unit_location)
        payload.consumer_unit_location =
          consumer.trim() === '' ? null : consumer.trim();
      await mobileApiClient.patch(
        `/api/properties/${propertyId}/access`,
        payload
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      Alert.alert(
        'Access updated',
        'The contractor will see this on their next visit. The lock-box code (if any) only appears 1 hour before their scheduled start.'
      );
    },
    onError: (err: unknown) => {
      type ApiErr = {
        status?: number;
        response?: { status?: number; data?: { error?: string } };
      };
      const apiErr = err as ApiErr;
      const status = apiErr.response?.status ?? apiErr.status;
      if (status === 403) {
        Alert.alert(
          'Not allowed',
          'Only the property owner or a manager-role team member can edit access info.'
        );
        return;
      }
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update access details.'
      );
    },
  });

  const handleSave = useCallback(() => {
    if (!isDirty || saveMutation.isPending) return;
    saveMutation.mutate();
  }, [isDirty, saveMutation]);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Ionicons name='key-outline' size={18} color={me.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Access & contacts</Text>
            <Text style={styles.subtitle}>
              How contractors get in + where the key utilities are.
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>How to get in</Text>
      <View style={styles.modeList}>
        {MODES.map((m) => {
          const selected = mode === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.modeRow, selected && styles.modeRowActive]}
              onPress={() => setMode(m.key)}
              activeOpacity={0.7}
              accessibilityRole='radio'
              accessibilityState={{ selected }}
            >
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={selected ? me.brand : me.ink3}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.modeLabel}>{m.label}</Text>
                <Text style={styles.modeSub}>{m.sub}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode === 'key_safe' ? (
        <>
          <Text style={styles.sectionLabel}>Lock-box code</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder='e.g. 4823'
            placeholderTextColor={me.ink3}
            style={styles.input}
            autoCapitalize='characters'
            autoCorrect={false}
            maxLength={64}
            // 2026-05-23: contextType='username' would be ideal here
            // to keep the password manager out, but RN's typing is
            // narrow — relying on autoCorrect=false + the explicit
            // "lock-box code" label.
          />
        </>
      ) : null}

      <Text style={styles.sectionLabel}>Notes for the contractor</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder='e.g. Side gate, watch out for the cat.'
        placeholderTextColor={me.ink3}
        style={[styles.input, styles.multiline]}
        multiline
        maxLength={2000}
      />

      <Text style={styles.sectionLabel}>Utility locations (optional)</Text>
      <TextInput
        value={stopcock}
        onChangeText={setStopcock}
        placeholder='Stopcock location'
        placeholderTextColor={me.ink3}
        style={styles.input}
        maxLength={500}
      />
      <TextInput
        value={gas}
        onChangeText={setGas}
        placeholder='Gas isolator location'
        placeholderTextColor={me.ink3}
        style={styles.input}
        maxLength={500}
      />
      <TextInput
        value={consumer}
        onChangeText={setConsumer}
        placeholder='Consumer unit location'
        placeholderTextColor={me.ink3}
        style={styles.input}
        maxLength={500}
      />

      <TouchableOpacity
        style={[
          styles.saveBtn,
          (!isDirty || saveMutation.isPending) && styles.saveBtnDisabled,
        ]}
        onPress={handleSave}
        disabled={!isDirty || saveMutation.isPending}
        activeOpacity={0.8}
      >
        {saveMutation.isPending ? (
          <ActivityIndicator size='small' color={me.onBrand} />
        ) : (
          <Text style={styles.saveBtnText}>
            {isDirty ? 'Save access details' : 'Up to date'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12, paddingBottom: 16 },
  headerCard: {
    backgroundColor: me.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: me.line,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: me.ink },
  subtitle: { fontSize: 13, color: me.ink2, marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  modeList: {
    backgroundColor: me.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: me.line,
    overflow: 'hidden',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  modeRowActive: {
    backgroundColor: me.brandSoft,
  },
  modeLabel: { fontSize: 14, fontWeight: '600', color: me.ink },
  modeSub: { fontSize: 12, color: me.ink3, marginTop: 2 },
  input: {
    backgroundColor: me.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: me.ink,
    borderWidth: 1,
    borderColor: me.line,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  saveBtn: {
    backgroundColor: me.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: {
    backgroundColor: me.bg3,
  },
  saveBtnText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '700',
  },
});
