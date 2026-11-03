import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Share } from 'react-native';
import * as Crypto from 'expo-crypto';
import { mobileApiClient } from '../../../utils/mobileApiClient';
export function CustomerCancellation({ contractId }: { contractId: string }) {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [requestId] = useState(() => Crypto.randomUUID());
  async function cancel() {
    setBusy(true);
    try {
      const d = await mobileApiClient.post<{ message: string }>(
        `/api/contracts/${contractId}/cancellation`,
        { message, requestId }
      );
      setResult(d.message);
      setSent(true);
      setMessage('');
    } catch (e) {
      setResult(
        e instanceof Error
          ? e.message
          : 'Could not save notice. You can notify the contractor and copy admin@mintenance.co.uk.'
      );
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      const data = await mobileApiClient.get<Record<string, unknown>>(
        `/api/contracts/${contractId}/consent`
      );
      await Share.share({ message: JSON.stringify(data, null, 2) });
    } catch {
      setResult('Could not load agreement records.');
    }
  }
  return (
    <View
      style={{
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginTop: 16,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '600' }}>
        Cancellation and your records
      </Text>
      <Pressable
        accessibilityRole='button'
        onPress={() => void copy()}
        style={{ paddingVertical: 14 }}
      >
        <Text>Save agreement and recorded choices</Text>
      </Pressable>
      <Text>
        You may notify the contractor and copy admin@mintenance.co.uk, or send a
        clear notice here. A notice does not itself confirm a refund.
      </Text>
      <TextInput
        accessibilityLabel='Cancellation notice'
        multiline
        value={message}
        onChangeText={setMessage}
        maxLength={5000}
        style={{
          minHeight: 90,
          borderWidth: 1,
          borderColor: '#aaa',
          borderRadius: 8,
          padding: 12,
          marginTop: 12,
        }}
      />
      <Pressable
        accessibilityRole='button'
        disabled={sent || busy || !message.trim()}
        onPress={() => void cancel()}
        style={{ paddingVertical: 16 }}
      >
        <Text>Send cancellation notice</Text>
      </Pressable>
      <Text accessibilityLiveRegion='polite'>{result}</Text>
    </View>
  );
}
