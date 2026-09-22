/**
 * RecurringMaintenance - Manage recurring maintenance schedules for a property
 */
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
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

// 2026-05-24 audit-31 P1: live recurring_schedules_frequency_check
// allows only {monthly, quarterly, biannual, annual} (verified via
// pg_constraint). The previous chip set included 'weekly' and
// 'yearly' which both 23514'd at the DB on save. Frequencies + colour
// labels now mirror the live constraint exactly. 'biannual' colour
// reused from quarterly's family for visual rhythm.
const FREQ_COLORS: Record<string, string> = {
  monthly: '#3B82F6',
  quarterly: '#F59E0B',
  biannual: '#8B5CF6',
  annual: '#10B981',
};

const FREQ_OPTIONS = ['monthly', 'quarterly', 'biannual', 'annual'] as const;

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: 'Every 6 months',
  annual: 'Annual',
};

export const RecurringMaintenance: React.FC<Props> = ({ propertyId }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const creating = useRef(false);
  const [firstDueDate, setFirstDueDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('monthly');

  const {
    data: schedules = [],
    isLoading,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ['recurring-maintenance', propertyId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await mobileApiClient.get<
        { schedules: Schedule[] } | Schedule[]
      >(`/api/properties/${propertyId}/recurring-maintenance`);
      const rows = Array.isArray(res) ? res : res?.schedules;
      if (!Array.isArray(rows))
        throw new Error('Schedule response was incomplete');
      return rows;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await mobileApiClient.post<{
        schedule?: { id?: string; property_id?: string };
      }>(`/api/properties/${propertyId}/recurring-maintenance`, {
        title: title.trim(),
        frequency,
        next_due_date: firstDueDate,
      });
      if (!result?.schedule?.id || result.schedule.property_id !== propertyId)
        throw new Error(
          'Schedule creation could not be confirmed. Refresh before retrying.'
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['recurring-maintenance', propertyId, user?.id],
      });
      setTitle('');
      setFirstDueDate('');
      setShowForm(false);
    },
    onError: (err: unknown) => {
      // 2026-05-28 T2: the server returns 402 with
      // { requiresSubscription, feature, message } when a free-tier
      // homeowner tries to schedule recurring maintenance (a Landlord+
      // feature). Previously we showed a generic "Failed to create
      // schedule" alert that hid the upgrade path — mirror the
      // TeamAccess gate and surface a clear CTA to the subscription
      // screen instead.
      type ApiErr = {
        status?: number;
        response?: {
          status?: number;
          data?: { requiresSubscription?: boolean; message?: string };
        };
        data?: { requiresSubscription?: boolean; message?: string };
      };
      const apiErr = err as ApiErr;
      const status = apiErr.response?.status ?? apiErr.status;
      const data = apiErr.response?.data ?? apiErr.data;
      if (status === 402 || data?.requiresSubscription) {
        Alert.alert(
          'Landlord plan required',
          data?.message ||
            'Recurring maintenance scheduling requires a Landlord or Agency subscription.',
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'View plans',
              onPress: () => {
                void Linking.openURL('mintenance://profile/subscription').catch(
                  () => {
                    Alert.alert(
                      'Could not open plans',
                      'Open Profile, then Subscription to view your plans.'
                    );
                  }
                );
              },
            },
          ]
        );
        return;
      }
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create schedule.'
      );
    },
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
    onError: (error: unknown) =>
      Alert.alert(
        'Schedule not saved',
        error instanceof Error ? error.message : 'Please retry.'
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['recurring-maintenance', propertyId, user?.id],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      await mobileApiClient.delete(
        `/api/properties/${propertyId}/recurring-maintenance?scheduleId=${scheduleId}`
      );
    },
    onError: (error: unknown) =>
      Alert.alert(
        'Schedule not saved',
        error instanceof Error ? error.message : 'Please retry.'
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['recurring-maintenance', propertyId, user?.id],
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
    if (title.trim().length < 5 || title.trim().length > 200) {
      Alert.alert(
        'Check the title',
        'Enter a title between 5 and 200 characters.'
      );
      return;
    }
    const parsed = new Date(`${firstDueDate}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== firstDueDate
    ) {
      Alert.alert(
        'First due date required',
        'Enter a valid date as YYYY-MM-DD.'
      );
      return;
    }
    if (creating.current) return;
    creating.current = true;
    void createMutation
      .mutateAsync()
      .catch(() => undefined)
      .finally(() => {
        creating.current = false;
      });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>RECURRING MAINTENANCE</Text>
        <TouchableOpacity
          accessibilityRole='button'
          accessibilityLabel={
            showForm ? 'Close schedule form' : 'Add recurring schedule'
          }
          onPress={() => setShowForm(!showForm)}
        >
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
            accessibilityLabel='Schedule title'
            placeholder='e.g. Boiler Service'
            placeholderTextColor={me.ink3}
          />
          <TextInput
            style={styles.input}
            accessibilityLabel='First due date, YYYY-MM-DD'
            placeholder='First due date: YYYY-MM-DD'
            value={firstDueDate}
            onChangeText={setFirstDueDate}
            autoCapitalize='none'
          />
          <Text style={styles.emptyText}>
            A job is created when the task becomes due. This does not charge you
            or book a contractor.
          </Text>
          <View style={styles.freqRow}>
            {FREQ_OPTIONS.map((f) => (
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
                  {FREQ_LABEL[f]}
                </Text>
              </TouchableOpacity>
            ))}
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

      {isLoading ? (
        <Text>Loading recurring schedules...</Text>
      ) : loadError ? (
        <TouchableOpacity
          accessibilityRole='button'
          accessibilityLabel='Retry loading schedules'
          onPress={() => refetch()}
        >
          <Text>Could not load schedules. Tap to retry.</Text>
        </TouchableOpacity>
      ) : schedules.length === 0 && !showForm ? (
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
              disabled={toggleMutation.isPending}
              accessibilityRole='button'
              accessibilityLabel={`${s.is_active ? 'Pause' : 'Resume'} ${s.title}`}
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
