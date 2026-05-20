import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useToast } from '../../components/ui/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { useAuth } from '../../contexts/AuthContext';
import type { ProfileStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'AddTimeEntry'>;
}

export const AddTimeEntryScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [taskDescription, setTaskDescription] = useState('');
  const [hours, setHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [billable, setBillable] = useState(true);
  const [date] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [startTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(false);

  const isValid = taskDescription.trim().length > 0 && parseFloat(hours) > 0;

  const isDirty = !!(taskDescription || hours || hourlyRate);
  const allowExit = useUnsavedChanges(isDirty);

  const handleSave = async () => {
    if (!isValid) {
      toast.error(
        'Missing fields',
        'Please enter a task description and hours.'
      );
      return;
    }

    if (!user?.id) {
      toast.error('Not authenticated', 'Please log in again.');
      return;
    }

    setLoading(true);
    try {
      // 2026-05-02 audit follow-up: API contract is camelCase
      // (`taskDescription` etc) — see `createEntrySchema` in
      // apps/web/app/api/contractor/time-tracking/route.ts. Sending
      // snake_case here failed Zod validation silently and the row
      // never landed.
      await mobileApiClient.post('/api/contractor/time-tracking', {
        taskDescription: taskDescription.trim(),
        durationMinutes: Math.round(parseFloat(hours) * 60),
        hourlyRate: parseFloat(hourlyRate) || 0,
        isBillable: billable,
        date,
        startTime,
      });
      queryClient.invalidateQueries({ queryKey: ['contractor-time-tracking'] });
      toast.success('Time entry added', `${hours}h logged successfully`);
      allowExit();
      navigation.goBack();
    } catch {
      toast.error('Failed to save entry', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle='dark-content' backgroundColor={me.surface} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='close' size={24} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Time Entry</Text>
        <TouchableOpacity
          style={[styles.headerButton, styles.saveButton]}
          onPress={handleSave}
          disabled={loading || !isValid}
        >
          <Text
            style={[
              styles.saveButtonText,
              (!isValid || loading) && styles.saveButtonDisabled,
            ]}
          >
            {loading ? 'Saving\u2026' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps='handled'
      >
        {/* Purpose banner — Mintenance job payment is fixed-price
            escrow, not hourly billing, so this screen is specifically
            for the contractor's own work log / schedule tracking.
            The Billable toggle only matters for manual invoices you
            generate through the Invoice Builder outside the escrow
            flow. */}
        <View style={styles.purposeBanner}>
          <View style={styles.purposeBannerIcon}>
            <Ionicons name='time-outline' size={20} color={me.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.purposeBannerTitle}>
              Your personal work log
            </Text>
            <Text style={styles.purposeBannerText}>
              Track how long you spend on jobs for your own records. Job
              payments go through escrow on the fixed price you bid.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Task Description *</Text>
          <TextInput
            style={styles.input}
            placeholder='e.g. Plumbing inspection at Oak Lane'
            placeholderTextColor={me.ink3}
            value={taskDescription}
            onChangeText={setTaskDescription}
            multiline
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Date</Text>
          <View style={styles.readonlyRow}>
            <Ionicons name='calendar-outline' size={18} color={me.ink3} />
            <Text style={styles.readonlyValue}>
              {new Date(date).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Hours *</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              placeholder='0.0'
              placeholderTextColor={me.ink3}
              value={hours}
              onChangeText={setHours}
              keyboardType='decimal-pad'
            />
            <Text style={styles.inputSuffix}>hours</Text>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            Hourly Rate (£)
          </Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputPrefix}>£</Text>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              placeholder='0.00'
              placeholderTextColor={me.ink3}
              value={hourlyRate}
              onChangeText={setHourlyRate}
              keyboardType='decimal-pad'
            />
          </View>

          {hours && hourlyRate ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Estimated total</Text>
              <Text style={styles.totalValue}>
                £
                {(
                  parseFloat(hours || '0') * parseFloat(hourlyRate || '0')
                ).toFixed(2)}
              </Text>
            </View>
          ) : null}

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.fieldLabel}>Billable</Text>
              <Text style={styles.switchSubtitle}>
                Flag this entry so the Invoice Builder can pull it into an
                ad-hoc client invoice (for work outside Mintenance's escrow
                flow).
              </Text>
            </View>
            <Switch
              value={billable}
              onValueChange={setBillable}
              trackColor={{
                false: me.line,
                true: me.ink,
              }}
              thumbColor={me.surface}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
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
  headerButton: { padding: 8, width: 60 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  saveButton: { alignItems: 'flex-end' },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
  },
  saveButtonDisabled: { opacity: 0.5 },
  content: { padding: 16 },
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 20,
    ...me.shadow.card,
  },
  purposeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: me.brandSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  purposeBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: me.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purposeBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 4,
  },
  purposeBannerText: {
    fontSize: 12,
    color: me.ink2,
    lineHeight: 17,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: me.ink,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputSmall: { width: 120 },
  inputPrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: me.ink2,
  },
  inputSuffix: { fontSize: 14, color: me.ink2 },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: me.bg2,
    borderRadius: 12,
  },
  readonlyValue: { fontSize: 15, color: me.ink },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    padding: 14,
    backgroundColor: me.brandSoft,
    borderRadius: 12,
  },
  totalLabel: { fontSize: 14, color: me.ink2 },
  totalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
  },
  switchSubtitle: {
    fontSize: 12,
    color: me.ink3,
    marginTop: 2,
  },
});
