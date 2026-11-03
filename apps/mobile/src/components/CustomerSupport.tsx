import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Linking,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { mobileApiClient } from '../utils/mobileApiClient';
type Ticket = { id: string; subject: string; status: string };
type Message = { id: string; body: string; created_at: string };
export function CustomerSupport({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(() => Crypto.randomUUID());
  async function load() {
    const d = await mobileApiClient.get<{ tickets: Ticket[] }>(
      '/api/support/tickets'
    );
    setTickets(d.tickets);
  }
  useEffect(() => {
    if (visible)
      void load().catch(() =>
        setResult(
          'Could not load support. You can email admin@mintenance.co.uk.'
        )
      );
  }, [visible]);
  async function open(id: string) {
    try {
      const d = await mobileApiClient.get<{ messages: Message[] }>(
        `/api/support/tickets/${id}`
      );
      setMessages(d.messages);
      setSelected(id);
      setBody('');
      setRequestId(Crypto.randomUUID());
    } catch {
      setResult('Could not load this conversation.');
    }
  }
  async function send() {
    setBusy(true);
    try {
      if (selected) {
        await mobileApiClient.post(
          `/api/support/tickets/${selected}/messages`,
          { body, requestId }
        );
        await open(selected);
      } else {
        const d = await mobileApiClient.post<{ ticket: { id: string } }>(
          '/api/support/tickets',
          { subject, message: body, requestId }
        );
        await open(d.ticket.id);
      }
      setBody('');
      setRequestId(Crypto.randomUUID());
      setResult('Message saved.');
      await load();
    } catch (e) {
      setResult(
        e instanceof Error ? e.message : 'Could not save your message.'
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal visible={visible} onRequestClose={onClose} animationType='slide'>
      <View
        style={{
          flex: 1,
          padding: 22,
          paddingTop: 55,
          backgroundColor: '#fff',
        }}
      >
        <Text
          accessibilityRole='header'
          style={{ fontSize: 24, fontWeight: '600' }}
        >
          Customer support
        </Text>
        <Text style={{ marginVertical: 12 }}>
          We check this inbox periodically during beta. It is not a live
          emergency service.
        </Text>
        <ScrollView keyboardShouldPersistTaps='handled'>
          <Pressable
            accessibilityRole='button'
            style={{ paddingVertical: 14 }}
            onPress={() => {
              setSelected(null);
              setMessages([]);
              setBody('');
              setRequestId(Crypto.randomUUID());
            }}
          >
            <Text>Start a new request</Text>
          </Pressable>
          {!selected &&
            tickets.map((t) => (
              <Pressable
                accessibilityRole='button'
                key={t.id}
                onPress={() => void open(t.id)}
                style={{
                  padding: 14,
                  borderBottomWidth: 1,
                  borderColor: '#ddd',
                }}
              >
                <Text>
                  {t.subject} · {t.status}
                </Text>
              </Pressable>
            ))}
          {selected ? (
            <>
              <Text selectable>Case {selected}</Text>
              {messages.map((m) => (
                <View
                  key={m.id}
                  style={{
                    padding: 14,
                    marginVertical: 6,
                    backgroundColor: '#f4f6f5',
                    borderRadius: 10,
                  }}
                >
                  <Text selectable>{m.body}</Text>
                  <Text style={{ fontSize: 11 }}>
                    {new Date(m.created_at).toLocaleString('en-GB')}
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <>
              <Text>Subject</Text>
              <TextInput
                accessibilityLabel='Support subject'
                value={subject}
                onChangeText={setSubject}
                maxLength={200}
                style={{
                  borderWidth: 1,
                  borderColor: '#aaa',
                  padding: 12,
                  borderRadius: 8,
                  marginVertical: 8,
                }}
              />
            </>
          )}
          <Text>Message</Text>
          <TextInput
            accessibilityLabel='Support message'
            multiline
            value={body}
            onChangeText={setBody}
            maxLength={5000}
            style={{
              minHeight: 120,
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: '#aaa',
              padding: 12,
              borderRadius: 8,
              marginVertical: 8,
            }}
          />
          <Text>Do not include passwords or full card details.</Text>
          <Pressable
            accessibilityRole='button'
            disabled={busy || !body.trim() || (!selected && !subject.trim())}
            onPress={() => void send()}
            style={{
              padding: 16,
              marginVertical: 10,
              backgroundColor: '#d6eee3',
              borderRadius: 8,
            }}
          >
            <Text>{busy ? 'Saving…' : 'Send message'}</Text>
          </Pressable>
          <Text accessibilityLiveRegion='polite'>{result}</Text>
          <Pressable
            accessibilityRole='link'
            onPress={() =>
              void Linking.openURL('mailto:admin@mintenance.co.uk')
            }
            style={{ padding: 12 }}
          >
            <Text>Email admin@mintenance.co.uk</Text>
          </Pressable>
        </ScrollView>
        <Pressable
          accessibilityRole='button'
          onPress={onClose}
          style={{ padding: 16 }}
        >
          <Text>Close support</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
