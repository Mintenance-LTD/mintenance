/**
 * RecurringMaintenance - Manage recurring maintenance schedules for a property
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { me } from '../../../design-system/mint-editorial';

interface Schedule {
  id: string;
  title: string;
  category: string;
  frequency: string;
  next_due_date: string;
  is_active: boolean;
}

interface Props {
  propertyId: string;
}

const FREQ_COLORS: Record<string, string> = {
  weekly: '#8B5CF6',
  monthly: '#3B82F6',
  quarterly: '#F59E0B',
  yearly: '#10B981',
};

export const RecurringMaintenance: React.FC<Props> = ({ propertyId }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('monthly');

  const { data: schedules = [] } = useQuery({
    queryKey: ['recurring-maintenance', propertyId],
    queryFn: async () => {
      const res = await mobileApiClient.get<
        { schedules: Schedule[] } | Schedule[]
      >(`/api/properties/${propertyId}/recurring-maintenance`);
      return Array.isArray(res) ? res : res?.schedules || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await mobileApiClient.post(
        `/api/properties/${propertyId}/recurring-maintenance`,
        {
          title: title.trim(),
          frequency,
          next_due_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['recurring-maintenance', propertyId],
      });
      setTitle('');
      setShowForm(false);
    },
    onError: (err: unknown) =>
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create schedule.'
      ),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      await mobileApiClient.patch(
        `/api/properties/${propertyId}/recurring-maintenance`,
        {
          scheduleId: id,
          is_active: !is_active,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['recurring-maintenance', propertyId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      await mobileApiClient.delete(
        `/api/properties/${propertyId}/recurring-maintenance?scheduleId=${scheduleId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['recurring-maintenance', propertyId],
      });
    },
  });

  const handleDelete = (id: string, itemTitle: string) => {
    Alert.alert('Delete Schedule', `Remove "${itemTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  const handleCreate = () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title.');
      return;
    }
    createMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>RECURRING MAINTENANCE</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Ionicons
            name={showForm ? 'close' : 'add-circle-outline'}
            size={22}
            color={me.brand}
          />
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder='e.g. Boiler Service'
            placeholderTextColor={me.ink3}
          />
          <View style={styles.freqRow}>
            {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map(
              (f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.freqChip,
                    frequency === f && { backgroundColor: FREQ_COLORS[f] },
                  ]}
                  onPress={() => setFrequency(f)}
                >
                  <Text
                    style={[
                      styles.freqText,
                      frequency === f && styles.freqTextActive,
                    ]}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={handleCreate}
            disabled={createMutation.isPending}
          >
            <Text style={styles.createBtnText}>
              {createMutation.isPending ? 'Adding...' : 'Add Schedule'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {schedules.length === 0 && !showForm ? (
        <View style={styles.emptyWrap}>
          <Ionicons name='repeat-outline' size={20} color={me.ink3} />
          <Text style={styles.emptyText}>No recurring schedules yet</Text>
        </View>
      ) : (
        schedules.map((s) => (
          <View
            key={s.id}
            style={[
              styles.scheduleRow,
              !s.is_active && styles.scheduleInactive,
            ]}
          >
            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() =>
                toggleMutation.mutate({ id: s.id, is_active: s.is_active })
              }
            >
              <Ionicons
                name={s.is_active ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={s.is_active ? me.brand : me.ink3}
              />
            </TouchableOpacity>
            <View style={styles.scheduleInfo}>
              <Text
                style={[
                  styles.scheduleTitle,
                  !s.is_active && styles.textInactive,
                ]}
              >
                {s.title}
              </Text>
              <View style={styles.scheduleMeta}>
                <View
                  style={[
                    styles.freqBadge,
                    {
                      backgroundColor:
                        (FREQ_COLORS[s.frequency] || '#999') + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.freqBadgeText,
                      { color: FREQ_COLORS[s.frequency] || '#999' },
                    ]}
                  >
                    {s.frequency}
                  </Text>
                </View>
                {s.next_due_date && (
                  <Text style={styles.dueDate}>
                    Due{' '}
                    {new Date(s.next_due_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDelete(s.id, s.title)}>
              <Ionicons name='trash-outline' size={18} color={me.errFg} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...me.shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  form: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: me.bg2,
    borderRadius: 12,
  },
  input: {
    backgroundColor: me.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: me.ink,
    marginBottom: 10,
  },
  freqRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  freqChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: me.bg2,
  },
  freqText: {
    fontSize: 12,
    fontWeight: '600',
    color: me.ink2,
  },
  freqTextActive: { color: me.onBrand },
  createBtn: {
    backgroundColor: me.brand,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  createBtnText: { color: me.onBrand, fontSize: 14, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  emptyText: { fontSize: 14, color: me.ink3 },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  scheduleInactive: { opacity: 0.5 },
  toggleBtn: { marginRight: 10 },
  scheduleInfo: { flex: 1 },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  textInactive: { textDecorationLine: 'line-through' },
  scheduleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  freqBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  freqBadgeText: { fontSize: 11, fontWeight: '600' },
  dueDate: { fontSize: 12, color: me.ink3 },
});
