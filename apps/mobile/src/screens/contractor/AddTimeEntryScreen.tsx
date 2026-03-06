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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { useToast } from '../../components/ui/Toast';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { ProfileStackParamList } from '../../navigation/types';

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'AddTimeEntry'>;
}

export const AddTimeEntryScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [taskDescription, setTaskDescription] = useState('');
  const [hours, setHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [billable, setBillable] = useState(true);
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [startTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(false);

  const isValid = taskDescription.trim().length > 0 && parseFloat(hours) > 0;

  const handleSave = async () => {
    if (!isValid) {
      toast.error('Missing fields', 'Please enter a task description and hours.');
      return;
    }

    setLoading(true);
    try {
      await mobileApiClient.post('/api/contractor/time-tracking', {
        taskDescription: taskDescription.trim(),
        durationMinutes: Math.round(parseFloat(hours) * 60),
        hourlyRate: parseFloat(hourlyRate) || 0,
        isBillable: billable,
        date,
        startTime,
      });
      toast.success('Time entry added', `${hours}h logged successfully`);
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
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Time Entry</Text>
        <TouchableOpacity
          style={[styles.headerButton, styles.saveButton]}
          onPress={handleSave}
          disabled={loading || !isValid}
        >
          <Text style={[styles.saveButtonText, (!isValid || loading) && styles.saveButtonDisabled]}>
            {loading ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Task Description *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Plumbing inspection at Oak Lane"
            placeholderTextColor={theme.colors.textTertiary}
            value={taskDescription}
            onChangeText={setTaskDescription}
            multiline
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Date</Text>
          <View style={styles.readonlyRow}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.textTertiary} />
            <Text style={styles.readonlyValue}>
              {new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Hours *</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              placeholder="0.0"
              placeholderTextColor={theme.colors.textTertiary}
              value={hours}
              onChangeText={setHours}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputSuffix}>hours</Text>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Hourly Rate (£)</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputPrefix}>£</Text>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textTertiary}
              value={hourlyRate}
              onChangeText={setHourlyRate}
              keyboardType="decimal-pad"
            />
          </View>

          {hours && hourlyRate ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Estimated total</Text>
              <Text style={styles.totalValue}>
                £{(parseFloat(hours || '0') * parseFloat(hourlyRate || '0')).toFixed(2)}
              </Text>
            </View>
          ) : null}

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.fieldLabel}>Billable</Text>
              <Text style={styles.switchSubtitle}>Include this time in client invoices</Text>
            </View>
            <Switch
              value={billable}
              onValueChange={setBillable}
              trackColor={{ false: theme.colors.border, true: '#222222' }}
              thumbColor={theme.colors.background}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  headerButton: { padding: 8, width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  saveButton: { alignItems: 'flex-end' },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  saveButtonDisabled: { opacity: 0.5 },
  content: { padding: 16 },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    ...theme.shadows.base,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputSmall: { width: 120 },
  inputPrefix: { fontSize: 18, fontWeight: '600', color: theme.colors.textSecondary },
  inputSuffix: { fontSize: 14, color: theme.colors.textSecondary },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  readonlyValue: { fontSize: 15, color: theme.colors.textPrimary },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F7F7F7',
    borderRadius: theme.borderRadius.md,
  },
  totalLabel: { fontSize: 13, color: theme.colors.textSecondary },
  totalValue: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  switchSubtitle: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
});

export default AddTimeEntryScreen;
