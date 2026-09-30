import { theme } from '../../../theme';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { ActionFollowup } from './ActionFollowup';
import { PortfolioReport } from './PortfolioReport';
interface Item {
  id: string;
  kind: string;
  property_id: string;
  property_name: string;
  title: string;
  next_action: string;
}
interface Queue {
  items: Item[];
  total: number;
  hasMore: boolean;
}
export function PortfolioActionQueue({
  onOpenProperty,
}: {
  onOpenProperty: (id: string) => void;
}) {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['portfolio-actions', user?.id, offset],
    enabled: !!user && expanded,
    queryFn: () =>
      mobileApiClient.get<Queue>(
        `/api/portfolio/queue?offset=${offset}&limit=5`
      ),
    staleTime: 30000,
  });
  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityRole='button'
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.heading}>
          Maintenance action queue {expanded ? '−' : '+'}
        </Text>
      </TouchableOpacity>
      {expanded && (
        <>
          <PortfolioReport />
          <Text>
            Open work, reports and upcoming renewals across your properties.
          </Text>
          {query.isPending ? (
            <Text accessibilityRole='text'>Loading actions…</Text>
          ) : query.isError ? (
            <TouchableOpacity
              accessibilityRole='button'
              onPress={() => void query.refetch()}
            >
              <Text>Unable to load actions. Tap to retry.</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text>{query.data?.total ?? 0} actions</Text>
              {query.data?.items.map((item) => (
                <View key={`${item.kind}:${item.id}`}>
                  <TouchableOpacity
                    style={styles.item}
                    accessibilityRole='button'
                    onPress={() => onOpenProperty(item.property_id)}
                  >
                    <Text>{item.property_name}</Text>
                    <Text style={styles.heading}>{item.title}</Text>
                    <Text>{item.next_action}</Text>
                    <Text>Open property →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole='button'
                    onPress={() =>
                      setEditing(editing === item.id ? null : item.id)
                    }
                  >
                    <Text>Manage follow-up</Text>
                  </TouchableOpacity>
                  {editing === item.id && (
                    <ActionFollowup
                      propertyId={item.property_id}
                      kind={item.kind}
                      sourceId={item.id}
                      onSaved={() => void query.refetch()}
                    />
                  )}
                </View>
              ))}
              <View style={styles.pages}>
                <TouchableOpacity
                  accessibilityRole='button'
                  disabled={offset === 0}
                  onPress={() => setOffset(Math.max(0, offset - 5))}
                >
                  <Text>{offset === 0 ? '' : 'Previous'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole='button'
                  disabled={!query.data?.hasMore}
                  onPress={() => setOffset(offset + 5)}
                >
                  <Text>{query.data?.hasMore ? 'Next' : ''}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    gap: 12,
  },
  heading: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  item: {
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pages: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
});
