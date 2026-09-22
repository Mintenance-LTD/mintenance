import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { me } from '../../../design-system/mint-editorial';

interface Invitation {
  id: string;
  propertyId: string;
  propertyName: string;
  role: string;
}
export function PropertyInvitations() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guard = useRef(false);
  const query = useQuery({
    queryKey: ['property-invitations', user?.id],
    queryFn: async () => {
      const data = await mobileApiClient.get<{ invites: Invitation[] }>(
        '/api/properties/invites'
      );
      if (!Array.isArray(data.invites))
        throw new Error('Invitations unavailable');
      return data.invites;
    },
    staleTime: 0,
  });
  const respond = async (invite: Invitation, action: 'accept' | 'decline') => {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await mobileApiClient.post<{
        success: boolean;
        status: string;
        propertyId: string;
      }>('/api/properties/invites', { inviteId: invite.id, action });
      if (
        result.success !== true ||
        result.propertyId !== invite.propertyId ||
        result.status !== (action === 'accept' ? 'accepted' : 'declined')
      )
        throw new Error('Unconfirmed response');
      await Promise.all([
        query.refetch(),
        client.invalidateQueries({ queryKey: ['properties', user?.id] }),
      ]);
    } catch {
      setError(
        'Your response could not be confirmed. Refresh invitations before trying again.'
      );
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };
  if (query.isLoading)
    return <Text style={styles.card}>Checking property invitations…</Text>;
  if (query.isError)
    return (
      <View style={styles.card}>
        <Text>Property invitations could not be loaded.</Text>
        <TouchableOpacity
          accessibilityRole='button'
          onPress={() => void query.refetch()}
        >
          <Text style={styles.action}>Retry invitations</Text>
        </TouchableOpacity>
      </View>
    );
  if (!query.data?.length) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Property invitations</Text>
      {query.data.map((invite) => (
        <View key={invite.id} style={styles.item}>
          <Text>
            {invite.propertyName} ·{' '}
            {invite.role === 'admin' ? 'Team administrator' : invite.role}
          </Text>
          <View style={styles.row}>
            <TouchableOpacity
              accessibilityRole='button'
              accessibilityLabel={`Accept invitation to ${invite.propertyName}`}
              disabled={busy}
              onPress={() => void respond(invite, 'accept')}
            >
              <Text style={styles.action}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole='button'
              accessibilityLabel={`Decline invitation to ${invite.propertyName}`}
              disabled={busy}
              onPress={() => void respond(invite, 'decline')}
            >
              <Text style={styles.action}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {error && (
        <>
          <Text accessibilityRole='alert'>{error}</Text>
          <TouchableOpacity
            accessibilityRole='button'
            disabled={busy}
            onPress={() => void query.refetch()}
          >
            <Text style={styles.action}>Refresh invitations</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: me.surface,
    borderColor: me.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    margin: 16,
    gap: 12,
  },
  title: { color: me.ink, fontSize: 18, fontWeight: '600' },
  item: { borderTopColor: me.line, borderTopWidth: 1, paddingTop: 12 },
  row: { flexDirection: 'row', gap: 24 },
  action: { color: me.brand, fontWeight: '600', paddingVertical: 12 },
});
