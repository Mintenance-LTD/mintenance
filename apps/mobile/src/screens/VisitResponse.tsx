import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { mobileApiClient } from '../utils/mobileApiClient';
export function VisitResponse({
  id,
  date,
  start,
  end,
  response,
  canRespond,
  onSaved,
}: {
  id: string;
  date: string;
  start: string;
  end?: string;
  response?: string;
  canRespond?: boolean;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save(value: string) {
    setBusy(true);
    setError('');
    try {
      await mobileApiClient.post('/api/appointments/respond', {
        id,
        date,
        start,
        end,
        response: value,
      });
      onSaved();
    } catch {
      setError('Response not saved. Refresh the visit and retry.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View>
      <Text>Client response: {response || 'pending'}</Text>
      {!!error && <Text accessibilityRole='alert'>{error}</Text>}
      {canRespond && (
        <>
          <TouchableOpacity
            accessibilityRole='button'
            disabled={busy}
            onPress={() => void save('confirmed')}
          >
            <Text>{busy ? 'Saving…' : 'Confirm visit'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole='button'
            disabled={busy}
            onPress={() => void save('change_requested')}
          >
            <Text>Request another time</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
