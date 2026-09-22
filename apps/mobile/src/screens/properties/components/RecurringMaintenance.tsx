/**
 * RecurringMaintenance - Manage recurring maintenance schedules for a property
 */
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { me } from '../../../design-system/mint-editorial';
import { styles } from './recurring-maintenance.styles';

interface Schedule {
  id: string;
  title: string;
  category: string;
  frequency: string;
  next_due_date: string;
  is_active: boolean;
  updated_at: string;
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
  const [editing, setEditing] = useState<Schedule | null>(null);
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
      if (editing && !editing.updated_at)
        throw new Error('Reload schedules before editing.');
      const result = await mobileApiClient[editing ? 'patch' : 'post']<{
        schedule?: { id?: string; property_id?: string };
      }>(`/api/properties/${propertyId}/recurring-maintenance`, {
        title: title.trim(),
        frequency,
        next_due_date: firstDueDate,
        ...(editing
          ? { scheduleId: editing.id, expected_updated_at: editing.updated_at }
          : {}),
      });
      if (
        !result?.schedule?.id ||
        result.schedule.property_id !== propertyId ||
        (editing && result.schedule.id !== editing.id)
      )
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
      setEditing(null);
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
      const result = await mobileApiClient.patch<{
        schedule?: { id: string; is_active: boolean };
      }>(`/api/properties/${propertyId}/recurring-maintenance`, {
        scheduleId: id,
        is_active: !is_active,
      });
      if (
        result.schedule?.id !== id ||
        result.schedule.is_active !== !is_active
      )
        throw new Error(
          'Schedule update was not confirmed. Refresh before retrying.'
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
      const result = await mobileApiClient.delete<{
        success?: boolean;
        scheduleId?: string;
      }>(
        `/api/properties/${propertyId}/recurring-maintenance?scheduleId=${scheduleId}`
      );
      if (result.success !== true || result.scheduleId !== scheduleId)
        throw new Error(
          'Schedule removal was not confirmed. Refresh before retrying.'
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
          disabled={createMutation.isPending}
          onPress={() => {
            setEditing(null);
            setTitle('');
            setFirstDueDate('');
            setFrequency('monthly');
            setShowForm(!showForm);
          }}
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
              {createMutation.isPending
                ? 'Saving...'
                : editing
                  ? 'Save Changes'
                  : 'Add Schedule'}
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
            <TouchableOpacity
              accessibilityRole='button'
              accessibilityLabel={`Edit ${s.title}`}
              disabled={createMutation.isPending}
              onPress={() => {
                setEditing(s);
                setTitle(s.title);
                setFrequency(s.frequency);
                setFirstDueDate(s.next_due_date.slice(0, 10));
                setShowForm(true);
              }}
            >
              <Text style={styles.dueDate}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole='button'
              accessibilityLabel={`Remove ${s.title}`}
              disabled={deleteMutation.isPending}
              onPress={() => handleDelete(s.id, s.title)}
            >
              <Ionicons name='trash-outline' size={18} color={me.errFg} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
};
