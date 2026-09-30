import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
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
export function ActionFollowup({
  propertyId,
  kind,
  sourceId,
  onSaved,
}: {
  propertyId: string;
  kind: string;
  sourceId: string;
  onSaved: () => void;
}) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0);
  const [assigned, setAssigned] = useState(''),
    [due, setDue] = useState(''),
    [waiting, setWaiting] = useState('manager'),
    [note, setNote] = useState('');
  const url = `/api/properties/${propertyId}/followups`;
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    mobileApiClient
      .get<Data>(`${url}?kind=${kind}&sourceId=${sourceId}`)
      .then((value) => {
        if (!active) return;
        setData(value);
        setAssigned(value.followup?.assigned_to || '');
        setDue(value.followup?.due_at?.slice(0, 10) || '');
        setWaiting(value.followup?.waiting_for || 'manager');
      })
      .catch(() => {
        if (active)
          setError('Unable to load follow-up. Owners and managers can edit.');
      });
    return () => {
      active = false;
    };
  }, [url, kind, sourceId, reload]);
  async function save() {
    if (!data || busy) return;
    if (
      due &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(due) ||
        !Number.isFinite(Date.parse(`${due}T23:59:59.000Z`)))
    ) {
      setError('Enter a date as YYYY-MM-DD.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await mobileApiClient.patch(url, {
        kind,
        sourceId,
        revision: data.followup?.revision || 0,
        assignedTo: assigned || null,
        dueAt: due ? `${due}T23:59:59.000Z` : null,
        waitingFor: waiting,
        note,
      });
      setNote('');
      setReload((value) => value + 1);
      onSaved();
    } catch {
      setError(
        'Save failed or another manager changed this item. Your input is preserved; reload before retrying a conflict.'
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ padding: 12, gap: 12 }}>
      <Text>
        Internal follow-up. Assigned managers receive an update notification;
        notes are not sent to tenants or contractors.
      </Text>
      {!!error && <Text accessibilityRole='alert'>{error}</Text>}
      <TouchableOpacity
        accessibilityRole='button'
        disabled={busy}
        onPress={() => setReload((value) => value + 1)}
      >
        <Text>Reload follow-up</Text>
      </TouchableOpacity>
      {data && (
        <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 12 }}>
          <Text>Responsible person</Text>
          {[
            { id: '', first_name: 'Unassigned', last_name: '' },
            ...data.people,
          ].map((person) => (
            <TouchableOpacity
              accessibilityRole='button'
              accessibilityState={{ selected: assigned === person.id }}
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
              accessibilityState={{ selected: waiting === value }}
              key={value}
              onPress={() => setWaiting(value)}
            >
              <Text>
                {waiting === value ? '✓ ' : ''}
                {value}
              </Text>
            </TouchableOpacity>
          ))}
          <TextInput
            accessibilityLabel='Follow-up date in UTC'
            placeholder='YYYY-MM-DD (UTC)'
            value={due}
            onChangeText={setDue}
          />
          <TextInput
            accessibilityLabel='Internal update'
            placeholder='Internal update'
            multiline
            maxLength={5000}
            value={note}
            onChangeText={setNote}
          />
          <TouchableOpacity
            accessibilityRole='button'
            disabled={busy}
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
