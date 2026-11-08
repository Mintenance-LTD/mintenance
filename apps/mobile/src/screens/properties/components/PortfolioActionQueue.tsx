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
  can_manage_followup?: boolean;
  assignee_name?: string | null;
  assignment_status?: 'assigned' | 'unassigned' | 'needs_reassignment';
}
interface Queue {
  items: Item[];
  total: number;
  hasMore: boolean;
  scope: string;
}
type Props = {
  onOpenProperty: (id: string) => void;
  onOpenJob?: (id: string) => void;
  initiallyExpanded?: boolean;
};
export function PortfolioActionQueue(props: Props) {
  const { user } = useAuth();
  if (!user) return null;
  return <ActionQueue key={user.id} {...props} userId={user.id} />;
}
function ActionQueue({
  onOpenProperty,
  onOpenJob,
  initiallyExpanded = false,
  userId,
}: Props & { userId?: string }) {
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [editing, setEditing] = useState<string | null>(null);
  const [scope, setScope] = useState('team');
  const query = useQuery({
    queryKey: ['portfolio-actions', userId, scope, offset],
    enabled: !!userId && expanded,
    retry: false,
    queryFn: async ({ signal }) => {
      const result = await mobileApiClient.get<Queue>(
        `/api/portfolio/queue?offset=${offset}&limit=5&scope=${scope}`,
        { signal, timeout: 15000, retries: 0 }
      );
      if (
        result?.scope !== scope ||
        !Array.isArray(result?.items) ||
        typeof result.total !== 'number' ||
        typeof result.hasMore !== 'boolean'
      ) {
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
          <View style={styles.filters}>
            {['team', 'mine', 'unassigned'].map((value) => (
              <TouchableOpacity
                key={value}
                style={styles.filter}
                accessibilityRole='button'
                accessibilityLabel={`${value === 'team' ? 'Team' : value === 'mine' ? 'Mine' : 'Unassigned'} queue`}
                accessibilityState={{ selected: scope === value }}
                onPress={() => {
                  setScope(value);
                  setOffset(0);
                  setEditing(null);
                }}
              >
                <Text>
                  {scope === value ? '✓ ' : ''}
                  {value === 'team'
                    ? 'Team'
                    : value === 'mine'
                      ? 'Mine'
                      : 'Unassigned'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text>
            Team includes all accessible actions. Mine shows your assignments.
            Unassigned includes work needing reassignment.
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
              {query.data?.items.length === 0 && (
                <Text>
                  {scope === 'mine'
                    ? 'No follow-ups assigned to you on this page.'
                    : 'No actions in this queue on this page.'}
                </Text>
              )}
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
                    <Text>
                      Responsible:{' '}
                      {item.assignment_status === 'needs_reassignment'
                        ? 'Needs reassignment'
                        : item.assignee_name || 'Unassigned'}
                    </Text>
                    <Text>{item.next_action}</Text>
                    {item.due_at &&
                      Number.isFinite(Date.parse(item.due_at)) && (
                        <Text>
                          {item.kind === 'report'
                            ? 'Report / follow-up date'
                            : 'Due'}
                          :{' '}
                          {new Date(item.due_at).toLocaleDateString('en-GB', {
                            timeZone: 'Europe/London',
                          })}
                        </Text>
                      )}
                    <Text>
                      {item.kind === 'job' && item.can_open_job && onOpenJob
                        ? 'Open job →'
                        : 'Open property →'}
                    </Text>
                  </TouchableOpacity>
                  {item.can_manage_followup === true ? (
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
                  ) : (
                    <Text>
                      View only — ask the property owner or manager to update
                      the follow-up.
                    </Text>
                  )}
                  {item.kind === 'report' && (
                    <IssueConversation reportId={item.id} />
                  )}
                  {item.can_manage_followup === true &&
                    editing === `${item.kind}:${item.id}` && (
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
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: {
    minHeight: 48,
    padding: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },
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
