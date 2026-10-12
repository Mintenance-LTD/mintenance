import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
// Retry identifier only; authorization comes from the authenticated session.
function messageId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
export function IssueConversation({ reportId }: { reportId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false),
    [offset, setOffset] = useState(0),
    [body, setBody] = useState(''),
    [pending, setPending] = useState<{ id: string; body: string } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['issue-conversation', user?.id, reportId, offset],
    enabled: open && !!user,
    queryFn: () =>
      mobileApiClient.get<{
        messages: { id: string; body: string; author_role: string }[];
        hasMore: boolean;
      }>(`/api/report-conversation?reportId=${reportId}&offset=${offset}`),
  });
  async function send() {
    if (!body.trim() || busy) return;
    const message =
      pending?.body === body ? pending : { id: messageId(), body };
    setPending(message);
    setBusy(true);
    setError('');
    try {
      await mobileApiClient.post('/api/report-conversation', {
        reportId,
        messageId: message.id,
        body: message.body,
      });
      setBody('');
      setPending(null);
      await query.refetch();
    } catch {
      setError('Message not confirmed. Retry to send the same message.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View>
      <TouchableOpacity
        accessibilityRole='button'
        onPress={() => setOpen(!open)}
      >
        <Text>Shared issue conversation {open ? '−' : '+'}</Text>
      </TouchableOpacity>
      {open && (
        <>
          <Text>
            Shared with the resident, managers and assigned contractor. Do not
            include access codes.
          </Text>
          {query.isError && <Text>Unable to load conversation.</Text>}
          <TouchableOpacity onPress={() => void query.refetch()}>
            <Text>Refresh messages</Text>
          </TouchableOpacity>
          {query.data?.messages.map((m) => (
            <View key={m.id}>
              <Text>{m.author_role}</Text>
              <Text>{m.body}</Text>
            </View>
          ))}
          <TouchableOpacity
            disabled={offset === 0}
            onPress={() => setOffset(Math.max(0, offset - 25))}
          >
            <Text>Previous messages</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!query.data?.hasMore}
            onPress={() => setOffset(offset + 25)}
          >
            <Text>Next messages</Text>
          </TouchableOpacity>
          <TextInput
            accessibilityLabel='Shared message'
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={5000}
            editable={!busy}
          />
          {!!error && <Text>{error}</Text>}
          <TouchableOpacity
            disabled={busy || !body.trim()}
            onPress={() => void send()}
          >
            <Text>{busy ? 'Sending…' : 'Send message'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
