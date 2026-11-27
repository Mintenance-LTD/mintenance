import { theme } from '../../../theme';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { ActionFollowup } from './ActionFollowup';
import { PortfolioReport } from './PortfolioReport';
import { IssueConversation } from './IssueConversation';
const PAGE_SIZE = 5;
const SCOPES = [
  {
    id: 'team',
    label: 'Team',
    hint: 'Actions across properties you can access.',
  },
  { id: 'mine', label: 'Mine', hint: 'Actions assigned to you.' },
  {
    id: 'unassigned',
    label: 'Unassigned',
    hint: 'Actions without an owner or needing reassignment.',
  },
] as const;

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
  onOpenSharedJob?: (propertyId: string, jobId: string) => void;
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
  onOpenSharedJob,
  initiallyExpanded = false,
  userId,
}: Props & { userId?: string }) {
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [editing, setEditing] = useState<string | null>(null);
  const [scope, setScope] = useState<(typeof SCOPES)[number]['id']>('team');
  const query = useQuery({
    queryKey: ['portfolio-actions', userId, scope, offset],
    enabled: !!userId && expanded,
    retry: false,
    queryFn: async ({ signal }) => {
      const result = await mobileApiClient.get<Queue>(
        `/api/portfolio/queue?offset=${offset}&limit=${PAGE_SIZE}&scope=${scope}`,
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
  const count = query.data?.items.length ?? 0;
  const total = query.data?.total ?? 0;
  const changePage = (next: number) => {
    setEditing(null);
    setOffset(next);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityRole='button'
        style={styles.tapTarget}
        accessibilityLabel='Maintenance action queue'
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.heading}>
          Maintenance action queue {expanded ? '−' : '+'}
        </Text>
      </TouchableOpacity>
      {expanded && (
        <>
          <Text>
            Open work, reports and upcoming renewals across your properties.
          </Text>
          <View style={styles.filters}>
            {SCOPES.map(({ id, label }) => (
              <TouchableOpacity
                key={id}
                style={[styles.filter, scope === id && styles.filterSelected]}
                accessibilityRole='button'
                accessibilityLabel={`${label} queue`}
                accessibilityState={{ selected: scope === id }}
                onPress={() => {
                  if (scope !== id) {
                    setScope(id);
                    changePage(0);
                  }
                }}
              >
                <Text style={styles.body}>
                  {scope === id ? '✓ ' : ''}
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.helper}>
            {SCOPES.find(({ id }) => scope === id)?.hint}
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
              <Text accessibilityLiveRegion='polite' style={styles.helper}>
                {count > 0
                  ? `Showing ${offset + 1}–${offset + count} of ${total}`
                  : `${total} actions`}
              </Text>
              {query.data?.items.length === 0 && (
                <Text>
                  {offset > 0
                    ? 'No actions on this page. Go back to see earlier actions.'
                    : scope === 'mine'
                      ? 'No follow-ups assigned to you.'
                      : scope === 'unassigned'
                        ? 'No actions need assignment.'
                        : 'No actions in the team queue.'}
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
                        : item.kind === 'job' && onOpenSharedJob
                          ? onOpenSharedJob(item.property_id, item.id)
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
                      {item.kind === 'job' &&
                      ((item.can_open_job && onOpenJob) || onOpenSharedJob)
                        ? 'Open job →'
                        : 'Open property →'}
                    </Text>
                  </TouchableOpacity>
                  {item.kind === 'report' && (
                    <IssueConversation
                      reportId={item.id}
                      caseTitle={item.title}
                    />
                  )}
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
              {(offset > 0 || query.data?.hasMore) && (
                <View style={styles.pages}>
                  {offset > 0 && (
                    <TouchableOpacity
                      accessibilityRole='button'
                      accessibilityLabel='Previous page'
                      style={styles.tapTarget}
                      onPress={() =>
                        changePage(Math.max(0, offset - PAGE_SIZE))
                      }
                    >
                      <Text style={styles.body}>Previous</Text>
                    </TouchableOpacity>
                  )}
                  {query.data?.hasMore && (
                    <TouchableOpacity
                      accessibilityRole='button'
                      accessibilityLabel='Next page'
                      style={[styles.tapTarget, styles.nextPage]}
                      onPress={() => changePage(offset + PAGE_SIZE)}
                    >
                      <Text style={styles.body}>Next</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}
          <PortfolioReport />
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  tapTarget: { minHeight: 44, justifyContent: 'center' },
  nextPage: { marginLeft: 'auto' },
  body: { color: theme.colors.textPrimary },
  helper: { color: theme.colors.textSecondary },
  filterSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
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
    flexWrap: 'wrap',
    gap: 16,
  },
});
