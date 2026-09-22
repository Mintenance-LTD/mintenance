import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Share, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { me } from '../../../design-system/mint-editorial';

interface ReportToken {
  id: string;
  property_id: string;
  label: string | null;
  is_active: boolean;
}

export function TenantReportingLinks({ propertyId }: { propertyId: string }) {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guard = useRef(false);
  const endpoint = `/api/properties/${propertyId}/report-token`;
  const query = useQuery({
    queryKey: ['property-reporting-links', user?.id, propertyId],
    queryFn: async () => {
      const data = await mobileApiClient.get<{ tokens: ReportToken[] }>(
        endpoint
      );
      if (!Array.isArray(data.tokens))
        throw new Error('Reporting links unavailable');
      return data.tokens;
    },
    staleTime: 0,
  });
  const change = async (token?: ReportToken) => {
    if (guard.current) return;
    guard.current = true;
    setPending(true);
    setError(null);
    try {
      const response = token
        ? await mobileApiClient.patch<{ token: ReportToken }>(endpoint, {
            token_id: token.id,
            is_active: !token.is_active,
          })
        : await mobileApiClient.post<{ token: ReportToken }>(endpoint, {
            label: 'Tenant reporting link',
          });
      if (
        !response.token?.id ||
        response.token.property_id !== propertyId ||
        (token &&
          (response.token.id !== token.id ||
            response.token.is_active !== !token.is_active))
      ) {
        throw new Error('Link update could not be confirmed');
      }
      await query.refetch();
    } catch {
      setError(
        'The link change could not be confirmed. Retry or check your subscription if access is restricted.'
      );
    } finally {
      guard.current = false;
      setPending(false);
    }
  };
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Tenant reporting links</Text>
      <Text style={styles.body}>
        Tenants can report maintenance without an account. Share links only with
        people who should report issues here.
      </Text>
      {query.isLoading ? (
        <Text>Loading reporting links…</Text>
      ) : query.isError ? (
        <>
          <Text accessibilityRole='alert'>
            Reporting links could not be loaded.
          </Text>
          <TouchableOpacity
            accessibilityRole='button'
            onPress={() => void query.refetch()}
          >
            <Text style={styles.action}>Retry reporting links</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {query.data?.length === 0 && <Text>No reporting links yet.</Text>}
          {query.data?.map((token) => (
            <View key={token.id} style={styles.item}>
              <Text>
                {token.label || 'Tenant report link'} ·{' '}
                {token.is_active ? 'Active' : 'Inactive'}
              </Text>
              <View style={styles.row}>
                <TouchableOpacity
                  accessibilityRole='button'
                  accessibilityLabel={`Share ${token.label || 'reporting link'}`}
                  onPress={async () => {
                    try {
                      await Share.share({
                        message: `https://www.mintenance.co.uk/report/${encodeURIComponent(token.id)}`,
                      });
                    } catch {
                      setError(
                        'The sharing menu could not be opened. Please retry.'
                      );
                    }
                  }}
                >
                  <Text style={styles.action}>Share link</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole='button'
                  disabled={pending}
                  onPress={() => void change(token)}
                >
                  <Text style={styles.action}>
                    {token.is_active ? 'Disable' : 'Enable'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity
            accessibilityRole='button'
            disabled={pending}
            onPress={() => void change()}
          >
            <Text style={styles.action}>
              {pending ? 'Saving…' : 'Generate report link'}
            </Text>
          </TouchableOpacity>
        </>
      )}
      {error && <Text accessibilityRole='alert'>{error}</Text>}
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
    gap: 12,
    marginBottom: 16,
  },
  title: { color: me.ink, fontSize: 18, fontWeight: '600' },
  body: { color: me.ink2, lineHeight: 21 },
  item: { gap: 8, borderTopWidth: 1, borderTopColor: me.line, paddingTop: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  action: { color: me.brand, fontWeight: '600', paddingVertical: 12 },
});
