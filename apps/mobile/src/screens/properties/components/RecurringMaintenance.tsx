import { scheduleRequest } from '../../../utils/scheduleRequestKey';
/**
 * RecurringMaintenance - Manage recurring maintenance schedules for a property
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  preferred_contractor_id?: string | null;
  notification_audience?: 'matching' | 'preferred';
}

interface Props {
  propertyId: string;
  editable?: boolean;
  onAccessDenied?: () => void;
}

// 2026-05-24 audit-31 P1: live recurring_schedules_frequency_check
// allows only {monthly, quarterly, biannual, annual} (verified via
// pg_constraint). The previous chip set included 'weekly' and
// 'yearly' which both 23514'd at the DB on save. Frequencies + colour
// labels now mirror the live constraint exactly. 'biannual' colour
// reused from quarterly's family for visual rhythm.
const FREQ_COLORS: Record<string, string> = {
  monthly: me.infoFg,
  quarterly: me.warnFg,
  biannual: me.infoFg,
  annual: me.okFg,
};

const FREQ_OPTIONS = ['monthly', 'quarterly', 'biannual', 'annual'] as const;

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: 'Every 6 months',
  annual: 'Annual',
};

export const RecurringMaintenance: React.FC<Props> = ({
  propertyId,
  editable = false,
  onAccessDenied,
}) => {
  const { user } = useAuth();
  if (!user) return <Text>Sign in to view recurring schedules.</Text>;
  return (
    <RecurringEditor
      key={`${user.id}:${propertyId}:${editable}`}
      propertyId={propertyId}
      editable={editable}
      onAccessDenied={onAccessDenied}
    />
  );
};

const RecurringEditor: React.FC<Props> = ({
  propertyId,
  editable = false,
  onAccessDenied,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const creating = useRef(false);
  const mounted = useRef(true);
  const allowed = useRef(false);
  const contractorRead = useRef<AbortController | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const [staleDraft, setStaleDraft] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [recovery, setRecovery] = useState('');
  const [loadingContractors, setLoadingContractors] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      contractorRead.current?.abort();
    };
  }, []);
  const [firstDueDate, setFirstDueDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [category, setCategory] = useState('handyman');
  const [preferredId, setPreferredId] = useState<string | null>(null);
  const [favouriteOnly, setFavouriteOnly] = useState(false);
  const [contractors, setContractors] = useState<
    { id: string; name: string }[]
  >([]);
  const loadContractors = async () => {
    if (!allowed.current || creating.current) return;
    contractorRead.current?.abort();
    const controller = new AbortController();
    contractorRead.current = controller;
    setLoadingContractors(true);
    try {
      const result = await mobileApiClient.get<{
        contractors: { id: string; name: string }[];
      }>(`/api/properties/${propertyId}/recurring-contractors`, {
        signal: controller.signal,
        timeout: 15000,
        retries: 0,
      });
      if (!mounted.current || controller.signal.aborted) return;
      if (
        !Array.isArray(result.contractors) ||
        result.contractors.some(
          (c) => !c || typeof c.id !== 'string' || typeof c.name !== 'string'
        )
      )
        throw new Error('Incomplete contractor response');
      setContractors(result.contractors);
      if (!result.contractors.length)
        Alert.alert(
          'No contractors',
          'No previously hired contractors are available.'
        );
    } catch (error) {
      if (!mounted.current || controller.signal.aborted) return;
      setContractors([]);
      if (
        [401, 403, 404].includes(
          (error as { statusCode?: number })?.statusCode ?? 0
        )
      )
        recordFailure(error);
      Alert.alert('Could not load contractors', 'Please retry.');
    } finally {
      if (mounted.current && contractorRead.current === controller)
        setLoadingContractors(false);
    }
  };

  const {
    data: schedules = [],
    isLoading,
    isFetching,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ['recurring-maintenance', propertyId, user?.id],
    enabled: !!user && !!propertyId,
    retry: false,
    networkMode: 'always',
    queryFn: async ({ signal }) => {
      const res = await mobileApiClient.get<
        { schedules: Schedule[] } | Schedule[]
      >(`/api/properties/${propertyId}/recurring-maintenance`, {
        signal,
        timeout: 15000,
        retries: 0,
      });
      const rows = Array.isArray(res) ? res : res?.schedules;
      if (
        !Array.isArray(rows) ||
        rows.some(
          (row) =>
            !row ||
            typeof row.id !== 'string' ||
            typeof row.title !== 'string' ||
            typeof row.next_due_date !== 'string' ||
            !Number.isFinite(Date.parse(row.next_due_date)) ||
            typeof row.is_active !== 'boolean'
        )
      )
        throw new Error('Schedule response was incomplete');
      return rows;
    },
  });

  const recordFailure = (error: unknown, hasDraft = !!editing) => {
    if (!mounted.current) return;
    const status =
      (error as { statusCode?: number; status?: number })?.statusCode ??
      (error as { status?: number })?.status;
    if ([401, 403, 404].includes(status ?? 0)) {
      setAccessDenied(true);
      setNeedsReload(true);
      setRecovery(
        'Access unavailable. Return to Properties to recheck your account and property permissions.'
      );
      queryClient.removeQueries({
        predicate: (query) => query.queryKey.includes(propertyId),
      });
      onAccessDenied?.();
    } else if (![400, 402, 422].includes(status ?? 0)) {
      setNeedsReload(true);
      setStaleDraft(hasDraft);
      setRecovery(
        'The schedule may have changed. Refresh schedules before another action.' +
          (hasDraft
            ? ' Your draft is retained; discard it and edit the latest schedule after refreshing.'
            : '')
      );
    }
  };

  const createMutation = useMutation({
    retry: false,
    networkMode: 'always',
    mutationFn: async () => {
      if (editing && !editing.updated_at)
        throw new Error('Reload schedules before editing.');
      const payload = {
        title: title.trim(),
        category,
        preferred_contractor_id: favouriteOnly ? preferredId : null,
        notification_audience: favouriteOnly ? 'preferred' : 'matching',
        frequency,
        next_due_date: firstDueDate,
        ...(editing
          ? { scheduleId: editing.id, expected_updated_at: editing.updated_at }
          : {}),
      };
      const operation = editing
        ? null
        : await scheduleRequest(`${user?.id}:${propertyId}`, payload);
      if (!mounted.current) throw new Error('Property changed before saving.');
      const result = await mobileApiClient[editing ? 'patch' : 'post']<{
        schedule?: { id?: string; property_id?: string; updated_at?: string };
      }>(`/api/properties/${propertyId}/recurring-maintenance`, payload, {
        timeout: 15000,
        retries: 0,
        ...(operation ? { headers: { 'Idempotency-Key': operation.key } } : {}),
      });
      if (
        !result?.schedule?.id ||
        result.schedule.property_id !== propertyId ||
        (editing &&
          (result.schedule.id !== editing.id ||
            !result.schedule.updated_at ||
            result.schedule.updated_at === editing.updated_at))
      )
        throw new Error(
          'Schedule creation could not be confirmed. Refresh before retrying.'
        );
      await operation?.complete();
    },
    onSuccess: () => {
      if (!mounted.current) return;
      queryClient.invalidateQueries({
        queryKey: ['recurring-maintenance', propertyId, user?.id],
      });
      setTitle('');
      setFirstDueDate('');
      setShowForm(false);
      setEditing(null);
      setRecovery('');
    },
    onError: (err: unknown) => {
      if (!mounted.current) return;
      if (
        editing ||
        [401, 403, 404].includes(
          (err as { statusCode?: number })?.statusCode ?? 0
        )
      )
        recordFailure(err);
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
      const status =
        apiErr.response?.status ??
        (err as { statusCode?: number }).statusCode ??
        apiErr.status;
      const data =
        apiErr.response?.data ??
        apiErr.data ??
        (
          err as {
            details?: { message?: string; requiresSubscription?: boolean };
          }
        ).details;
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
    retry: false,
    networkMode: 'always',
    mutationFn: async ({
      id,
      is_active,
      updated_at,
    }: {
      id: string;
      is_active: boolean;
      updated_at: string;
    }) => {
      if (!updated_at)
        throw new Error('Reload schedules before changing their status.');
      const result = await mobileApiClient.patch<{
        schedule?: {
          id: string;
          property_id: string;
          is_active: boolean;
          updated_at: string;
        };
      }>(
        `/api/properties/${propertyId}/recurring-maintenance`,
        {
          scheduleId: id,
          is_active: !is_active,
          expected_updated_at: updated_at,
        },
        { timeout: 15000, retries: 0 }
      );
      if (
        result.schedule?.id !== id ||
        result.schedule.is_active !== !is_active ||
        result.schedule.property_id !== propertyId ||
        !result.schedule.updated_at ||
        result.schedule.updated_at === updated_at
      )
        throw new Error(
          'Schedule update was not confirmed. Refresh before retrying.'
        );
    },
    onError: (error: unknown) => {
      if (!mounted.current) return;
      recordFailure(error);
      Alert.alert(
        'Schedule not saved',
        error instanceof Error ? error.message : 'Please retry.'
      );
    },
    onSuccess: () => {
      if (!mounted.current) return;
      queryClient.invalidateQueries({
        queryKey: ['recurring-maintenance', propertyId, user?.id],
      });
    },
  });

  const deleteMutation = useMutation({
    retry: false,
    networkMode: 'always',
    mutationFn: async (scheduleId: string) => {
      const result = await mobileApiClient.delete<{
        success?: boolean;
        scheduleId?: string;
      }>(
        `/api/properties/${propertyId}/recurring-maintenance?scheduleId=${scheduleId}`,
        { timeout: 15000, retries: 0 }
      );
      if (result.success !== true || result.scheduleId !== scheduleId)
        throw new Error(
          'Schedule removal was not confirmed. Refresh before retrying.'
        );
    },
    onError: (error: unknown) => {
      if (!mounted.current) return;
      recordFailure(error);
      Alert.alert(
        'Schedule not saved',
        error instanceof Error ? error.message : 'Please retry.'
      );
    },
    onSuccess: (_result, scheduleId) => {
      if (!mounted.current) return;
      if (editing?.id === scheduleId) {
        setEditing(null);
        setShowForm(false);
        setStaleDraft(false);
        setRecovery('');
      }
      queryClient.invalidateQueries({
        queryKey: ['recurring-maintenance', propertyId, user?.id],
      });
    },
  });

  const busy =
    createMutation.isPending ||
    toggleMutation.isPending ||
    deleteMutation.isPending;
  const blocked =
    busy ||
    isLoading ||
    isFetching ||
    !!loadError ||
    needsReload ||
    accessDenied;
  useLayoutEffect(() => {
    allowed.current = editable && !blocked;
  }, [editable, blocked]);
  const runMutation = (operation: () => Promise<unknown>) => {
    if (!mounted.current || !allowed.current || creating.current) return;
    creating.current = true;
    void operation()
      .catch(() => undefined)
      .finally(() => {
        creating.current = false;
      });
  };
  const refreshSchedules = async () => {
    if (!mounted.current || creating.current || isFetching) return;
    const result = await refetch();
    if (!mounted.current || result.isError) return;
    setNeedsReload(false);
    // A successful list read proves viewing access, not management permission.
    // Re-enter the authorized property page after a mutation access failure.
    if (!staleDraft && !accessDenied) setRecovery('');
  };

  const handleDelete = (id: string, itemTitle: string) => {
    if (!allowed.current || creating.current) return;
    Alert.alert('Delete Schedule', `Remove "${itemTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => runMutation(() => deleteMutation.mutateAsync(id)),
      },
    ]);
  };

  const handleCreate = () => {
    if (!allowed.current || staleDraft) return;
    if (favouriteOnly && !preferredId) {
      Alert.alert(
        'Choose a contractor',
        'Select a previously hired contractor.'
      );
      return;
    }
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
    runMutation(() => createMutation.mutateAsync());
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>RECURRING MAINTENANCE</Text>
        {editable && (
          <TouchableOpacity
            accessibilityRole='button'
            accessibilityLabel={
              showForm ? 'Close schedule form' : 'Add recurring schedule'
            }
            disabled={blocked}
            accessibilityState={{ disabled: blocked }}
            style={styles.actionBtn}
            onPress={() => {
              if (!allowed.current || creating.current) return;
              setStaleDraft(false);
              setRecovery('');
              setEditing(null);
              setCategory('handyman');
              setPreferredId(null);
              setFavouriteOnly(false);
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
        )}
      </View>

      <TouchableOpacity
        accessibilityRole='button'
        accessibilityLabel='Refresh schedules'
        disabled={busy || isFetching}
        accessibilityState={{ disabled: busy || isFetching }}
        style={styles.actionBtn}
        onPress={() => void refreshSchedules()}
      >
        <Text style={styles.emptyText}>Refresh schedules</Text>
      </TouchableOpacity>
      {!!recovery && (
        <Text accessibilityRole='alert' style={styles.emptyText}>
          {recovery}
        </Text>
      )}

      {editable && showForm && !accessDenied && !loadError && (
        <View style={styles.form}>
          {staleDraft && (
            <Text style={styles.emptyText}>
              Unsaved draft — review the latest schedule before saving
            </Text>
          )}
          <TextInput
            editable={!blocked}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            accessibilityLabel='Schedule title'
            placeholder='e.g. Boiler Service'
            placeholderTextColor={me.ink3}
          />
          <TextInput
            editable={!blocked}
            style={styles.input}
            accessibilityLabel='First due date, YYYY-MM-DD'
            placeholder='First due date: YYYY-MM-DD'
            value={firstDueDate}
            onChangeText={setFirstDueDate}
            autoCapitalize='none'
          />
          <Text style={styles.emptyText}>Trade category</Text>
          <View style={[styles.freqRow, { flexWrap: 'wrap' }]}>
            {[
              'plumbing',
              'electrical',
              'heating',
              'carpentry',
              'painting',
              'roofing',
              'flooring',
              'gardening',
              'cleaning',
              'handyman',
              'hvac',
              'pest_control',
              'other',
            ].map((trade) => (
              <TouchableOpacity
                key={trade}
                style={styles.freqChip}
                accessibilityRole='radio'
                disabled={blocked}
                accessibilityState={{
                  checked: category === trade,
                  disabled: blocked,
                }}
                onPress={() => setCategory(trade)}
              >
                <Text>
                  {category === trade ? 'Selected: ' : ''}
                  {trade.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            accessibilityRole='checkbox'
            disabled={blocked}
            style={styles.actionBtn}
            accessibilityState={{ checked: favouriteOnly, disabled: blocked }}
            onPress={() => setFavouriteOnly(!favouriteOnly)}
          >
            <Text style={styles.emptyText}>
              {favouriteOnly ? 'Selected: ' : ''}Notify my chosen favourite only
            </Text>
          </TouchableOpacity>
          {favouriteOnly && (
            <View>
              <TouchableOpacity
                accessibilityRole='button'
                disabled={blocked || loadingContractors}
                accessibilityState={{ disabled: blocked || loadingContractors }}
                style={styles.actionBtn}
                onPress={loadContractors}
              >
                <Text style={styles.emptyText}>
                  {loadingContractors
                    ? 'Loading contractors...'
                    : 'Load previously hired contractors'}
                </Text>
              </TouchableOpacity>
              {contractors.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  accessibilityRole='radio'
                  disabled={blocked}
                  style={styles.actionBtn}
                  accessibilityState={{
                    checked: preferredId === c.id,
                    disabled: blocked,
                  }}
                  onPress={() => setPreferredId(c.id)}
                >
                  <Text style={styles.emptyText}>
                    {preferredId === c.id ? 'Selected: ' : ''}
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={styles.emptyText}>
            Alerts require a matching trade and service area. The job remains
            open for bids.
          </Text>
          <Text style={styles.emptyText}>
            A job is created when the task becomes due. This does not charge you
            or book a contractor.
          </Text>
          <View style={styles.freqRow}>
            {FREQ_OPTIONS.map((f) => (
              <TouchableOpacity
                key={f}
                accessibilityRole='radio'
                disabled={blocked}
                accessibilityState={{
                  checked: frequency === f,
                  disabled: blocked,
                }}
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
            accessibilityRole='button'
            onPress={handleCreate}
            disabled={blocked || staleDraft}
            accessibilityState={{ disabled: blocked || staleDraft }}
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

      {isLoading || isFetching ? (
        <Text>Loading recurring schedules...</Text>
      ) : loadError ? (
        <TouchableOpacity
          accessibilityRole='button'
          accessibilityLabel='Retry loading schedules'
          style={styles.actionBtn}
          onPress={() => void refreshSchedules()}
        >
          <Text style={{ color: me.ink }}>
            {[401, 403, 404].includes(
              (loadError as { statusCode?: number }).statusCode ?? 0
            )
              ? 'Access unavailable. Check your account or ask the property owner, then tap to retry.'
              : 'Could not load schedules. Tap to retry.'}
          </Text>
        </TouchableOpacity>
      ) : accessDenied ? null : schedules.length === 0 && !showForm ? (
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
            {editable && (
              <TouchableOpacity
                style={styles.toggleBtn}
                disabled={blocked}
                accessibilityState={{ disabled: blocked }}
                accessibilityRole='button'
                accessibilityLabel={`${s.is_active ? 'Pause' : 'Resume'} ${s.title}`}
                onPress={() => runMutation(() => toggleMutation.mutateAsync(s))}
              >
                <Ionicons
                  name={s.is_active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={s.is_active ? me.brand : me.ink3}
                />
              </TouchableOpacity>
            )}
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
                        (FREQ_COLORS[s.frequency] || me.ink2) + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.freqBadgeText,
                      { color: FREQ_COLORS[s.frequency] || '#999' },
                    ]}
                  >
                    {FREQ_LABEL[s.frequency] || s.frequency}
                  </Text>
                </View>
                {s.next_due_date && (
                  <Text style={styles.dueDate}>
                    {s.is_active ? 'Due' : 'Paused · recorded due date'}{' '}
                    {new Date(
                      s.next_due_date.slice(0, 10) + 'T00:00:00Z'
                    ).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </Text>
                )}
              </View>
            </View>
            {editable && (
              <>
                <TouchableOpacity
                  accessibilityRole='button'
                  accessibilityLabel={`${staleDraft ? 'Discard draft and edit latest' : 'Edit'} ${s.title}`}
                  disabled={blocked}
                  style={styles.actionBtn}
                  accessibilityState={{ disabled: blocked }}
                  onPress={() => {
                    if (!allowed.current || creating.current) return;
                    setStaleDraft(false);
                    setRecovery('');
                    setEditing(s);
                    setCategory(s.category || 'handyman');
                    setPreferredId(s.preferred_contractor_id ?? null);
                    setFavouriteOnly(s.notification_audience === 'preferred');
                    setTitle(s.title);
                    setFrequency(s.frequency);
                    setFirstDueDate(s.next_due_date.slice(0, 10));
                    setShowForm(true);
                  }}
                >
                  <Text style={styles.dueDate}>
                    {staleDraft ? 'Discard draft and edit latest' : 'Edit'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole='button'
                  accessibilityLabel={`Remove ${s.title}`}
                  disabled={blocked}
                  style={styles.actionBtn}
                  accessibilityState={{ disabled: blocked }}
                  onPress={() => handleDelete(s.id, s.title)}
                >
                  <Ionicons name='trash-outline' size={18} color={me.errFg} />
                </TouchableOpacity>
              </>
            )}
          </View>
        ))
      )}
    </View>
  );
};
