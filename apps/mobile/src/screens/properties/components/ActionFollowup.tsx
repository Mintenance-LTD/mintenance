import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  propertyFollowupDate,
  propertyFollowupDeadline,
} from '@mintenance/shared';
import { theme } from '../../../theme';
import { mobileApiClient } from '../../../utils/mobileApiClient';
interface Data {
  followup: {
    revision: number;
    assigned_to: string | null;
    due_at: string | null;
    waiting_for: string;
  } | null;
  people: { id: string; first_name: string; last_name: string }[];
  updates: { id: string; body: string; delivery?: { status: string } | null }[];
}
type Props = {
  propertyId: string;
  kind: string;
  sourceId: string;
  onSaved: () => void;
};
export function ActionFollowup(props: Props) {
  return (
    <FollowupEditor
      key={`${props.propertyId}:${props.kind}:${props.sourceId}`}
      {...props}
    />
  );
}
function FollowupEditor({ propertyId, kind, sourceId, onSaved }: Props) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0);
  const [assigned, setAssigned] = useState(''),
    [due, setDue] = useState(''),
    [waiting, setWaiting] = useState('manager'),
    [note, setNote] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState('');
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const url = `/api/properties/${propertyId}/followups`;
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setData(null);
    setError('');
    setBlocked(true);
    mobileApiClient
      .get<Data>(`${url}?kind=${kind}&sourceId=${sourceId}`, {
        signal: controller.signal,
        timeout: 15000,
        retries: 0,
      })
      .then((value) => {
        if (!active) return;
        if (
          !value ||
          !Array.isArray(value.people) ||
          !Array.isArray(value.updates) ||
          (value.followup !== null &&
            (!value.followup || !Number.isInteger(value.followup.revision)))
        )
          throw new Error('Invalid follow-up details');
        setData(value);
        setAssigned(value.followup?.assigned_to || '');
        setDue(propertyFollowupDate(value.followup?.due_at));
        setWaiting(value.followup?.waiting_for || 'manager');
        setBlocked(false);
      })
      .catch(() => {
        if (active)
          setError('Unable to load follow-up. Owners and managers can edit.');
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [url, kind, sourceId, reload]);
  async function save() {
    if (!data || saving.current || blocked) return;
    const deadline = due ? propertyFollowupDeadline(due) : null;
    if (due && !deadline) {
      setError('Enter a valid calendar date as YYYY-MM-DD.');
      return;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await mobileApiClient.patch<{
        followup: { revision: number };
      }>(url, {
        kind,
        sourceId,
        revision: data.followup?.revision || 0,
        assignedTo: assigned || null,
        dueAt:
          due === propertyFollowupDate(data.followup?.due_at)
            ? (data.followup?.due_at ?? null)
            : deadline,
        waitingFor: waiting,
        note,
      });
      if (!mounted.current) return;
      if (result?.followup?.revision !== (data.followup?.revision ?? 0) + 1)
        throw new Error('Unconfirmed save');
      setNote('');
      setMessage('Follow-up saved.');
      setReload((value) => value + 1);
      onSaved();
    } catch (reason) {
      if (!mounted.current) return;
      setBlocked(true);
      const status = (reason as { statusCode?: number } | null)?.statusCode;
      setError(
        status === 409
          ? 'This follow-up changed. Reload and review the latest values before saving. Your note is still here.'
          : status === 401 || status === 403
            ? 'Your access could not be confirmed. Sign in or ask the property owner for access, then reload.'
            : 'Save could not be confirmed. Reload and check recorded updates before saving again. Your input is still here.'
      );
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <View style={styles.container}>
      <Text>
        Internal follow-up. Assigned managers receive an update notification;
        notes are not sent to tenants or contractors.
      </Text>
      {!!error && <Text accessibilityRole='alert'>{error}</Text>}
      {!!message && <Text accessibilityLiveRegion='polite'>{message}</Text>}
      <TouchableOpacity
        accessibilityRole='button'
        disabled={busy}
        style={styles.control}
        accessibilityState={{ disabled: busy }}
        onPress={() => {
          setMessage('');
          setReload((value) => value + 1);
        }}
      >
        <Text>Reload follow-up</Text>
      </TouchableOpacity>
      {!data && (
        <Text accessibilityLiveRegion='polite'>
          {error
            ? 'Follow-up unavailable. Reload to try again.'
            : 'Loading follow-up…'}
        </Text>
      )}
      {data && (
        <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 12 }}>
          <Text>Responsible person</Text>
          {[
            { id: '', first_name: 'Unassigned', last_name: '' },
            ...data.people,
          ].map((person) => (
            <TouchableOpacity
              accessibilityRole='button'
              accessibilityState={{
                selected: assigned === person.id,
                disabled: busy,
              }}
              disabled={busy}
              style={[
                styles.control,
                assigned === person.id && styles.selected,
              ]}
              key={person.id}
              onPress={() => setAssigned(person.id)}
            >
              <Text>
                {assigned === person.id ? '✓ ' : ''}
                {person.first_name} {person.last_name}
              </Text>
            </TouchableOpacity>
          ))}
          <Text>Awaiting</Text>
          {['manager', 'tenant', 'contractor', 'approval'].map((value) => (
            <TouchableOpacity
              accessibilityRole='button'
              accessibilityState={{
                selected: waiting === value,
                disabled: busy,
              }}
              disabled={busy}
              style={[styles.control, waiting === value && styles.selected]}
              key={value}
              onPress={() => setWaiting(value)}
            >
              <Text>
                {waiting === value ? '✓ ' : ''}
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          <Text>Follow up by (UK date)</Text>
          <TextInput
            accessibilityLabel='Follow-up date (UK date)'
            placeholder='YYYY-MM-DD'
            editable={!busy}
            style={styles.input}
            value={due}
            onChangeText={setDue}
          />
          <Text>
            Due by the end of the selected day in Europe/London, including
            daylight saving.
          </Text>
          <TextInput
            accessibilityLabel='Internal update'
            placeholder='Internal update'
            multiline
            editable={!busy}
            style={[styles.input, { minHeight: 96, textAlignVertical: 'top' }]}
            maxLength={5000}
            value={note}
            onChangeText={setNote}
          />
          <TouchableOpacity
            accessibilityRole='button'
            disabled={busy || blocked}
            accessibilityState={{ disabled: busy || blocked }}
            style={styles.control}
            onPress={() => void save()}
          >
            <Text>{busy ? 'Saving…' : 'Save follow-up'}</Text>
          </TouchableOpacity>
          <Text>Latest 50 updates</Text>
          {data.updates.map((update) => (
            <Text key={update.id}>
              {update.body}
              {update.delivery
                ? `\nAssignment notification: ${update.delivery.status}`
                : ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  control: {
    minHeight: 48,
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },
  selected: {
    borderColor: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
  },
  input: {
    minHeight: 48,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    color: theme.colors.textPrimary,
  },
});
