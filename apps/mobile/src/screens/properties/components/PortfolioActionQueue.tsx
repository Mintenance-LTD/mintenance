import { theme } from '../../../theme';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { ActionFollowup } from './ActionFollowup';
import { PortfolioReport } from './PortfolioReport';
import { IssueConversation } from './IssueConversation';
interface Item {
  id: string;
  kind: string;
  property_id: string;
  property_name: string;
  title: string;
  next_action: string;
  can_open_job?: boolean;
  due_at?: string | null;
}
interface Queue {
  items: Item[];
  total: number;
  hasMore: boolean;
}
export function PortfolioActionQueue({
  onOpenProperty,
  onOpenJob,
  initiallyExpanded = false,
}: {
  onOpenProperty: (id: string) => void;
  onOpenJob?: (id: string) => void;
  initiallyExpanded?: boolean;
}) {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [editing, setEditing] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['portfolio-actions', user?.id, offset],
    enabled: !!user && expanded,
    queryFn: async () => {
      const result = await mobileApiClient.get<Queue>(
        `/api/portfolio/queue?offset=${offset}&limit=5`
      );
      if (!Array.isArray(result?.items) || typeof result.total !== 'number') {
        throw new Error('Unable to confirm action queue');
      }
      return result;
    },
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
                    onPress={() =>
                      item.kind === 'job' && item.can_open_job && onOpenJob
                        ? onOpenJob(item.id)
                        : onOpenProperty(item.property_id)
                    }
                  >
                    <Text>{item.property_name}</Text>
                    <Text style={styles.heading}>{item.title}</Text>
                    <Text>{item.next_action}</Text>
                    {item.due_at &&
                      Number.isFinite(Date.parse(item.due_at)) && (
                        <Text>
                          {item.kind === 'report'
                            ? 'Report / follow-up date'
                            : 'Due'}
                          : {new Date(item.due_at).toLocaleDateString('en-GB')}
                        </Text>
                      )}
                    <Text>
                      {item.kind === 'job' && item.can_open_job && onOpenJob
                        ? 'Open job →'
                        : 'Open property →'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole='button'
                    onPress={() =>
                      setEditing(
                        editing === `${item.kind}:${item.id}`
                          ? null
                          : `${item.kind}:${item.id}`
                      )
                    }
                  >
                    <Text>Manage follow-up</Text>
                  </TouchableOpacity>
                  {item.kind === 'report' && (
                    <IssueConversation reportId={item.id} />
                  )}
                  {editing === `${item.kind}:${item.id}` && (
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
