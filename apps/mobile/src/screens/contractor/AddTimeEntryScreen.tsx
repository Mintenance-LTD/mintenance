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
          <Ionicons name="close" size={24} color="#222222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Time Entry</Text>
        <TouchableOpacity
          style={[styles.headerButton, styles.saveButton]}
          onPress={handleSave}
          disabled={loading || !isValid}
        >
          <Text style={[styles.saveButtonText, (!isValid || loading) && styles.saveButtonDisabled]}>
            {loading ? 'Saving\u2026' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Task Description *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Plumbing inspection at Oak Lane"
            placeholderTextColor="#B0B0B0"
            value={taskDescription}
            onChangeText={setTaskDescription}
            multiline
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Date</Text>
          <View style={styles.readonlyRow}>
            <Ionicons name="calendar-outline" size={18} color="#B0B0B0" />
            <Text style={styles.readonlyValue}>
              {new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Hours *</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              placeholder="0.0"
              placeholderTextColor="#B0B0B0"
              value={hours}
              onChangeText={setHours}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputSuffix}>hours</Text>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Hourly Rate (\u00A3)</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputPrefix}>\u00A3</Text>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              placeholder="0.00"
              placeholderTextColor="#B0B0B0"
              value={hourlyRate}
              onChangeText={setHourlyRate}
              keyboardType="decimal-pad"
            />
          </View>

          {hours && hourlyRate ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Estimated total</Text>
              <Text style={styles.totalValue}>
                \u00A3{(parseFloat(hours || '0') * parseFloat(hourlyRate || '0')).toFixed(2)}
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
              trackColor={{ false: '#EBEBEB', true: '#222222' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  headerButton: { padding: 8, width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#222222' },
  saveButton: { alignItems: 'flex-end' },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#222222' },
  saveButtonDisabled: { opacity: 0.5 },
  content: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0B0B0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#222222',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputSmall: { width: 120 },
  inputPrefix: { fontSize: 18, fontWeight: '600', color: '#717171' },
  inputSuffix: { fontSize: 14, color: '#717171' },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
  },
  readonlyValue: { fontSize: 15, color: '#222222' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    padding: 14,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
  },
  totalLabel: { fontSize: 14, color: '#717171' },
  totalValue: { fontSize: 17, fontWeight: '700', color: '#222222' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
  },
  switchSubtitle: { fontSize: 12, color: '#B0B0B0', marginTop: 2 },
});

export default AddTimeEntryScreen;
