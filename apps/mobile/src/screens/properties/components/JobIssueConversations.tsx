import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { IssueConversation } from './IssueConversation';
export function JobIssueConversations({ jobId }: { jobId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false),
    [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: ['job-issue-conversations', user?.id, jobId, offset],
    enabled: open && !!user,
    queryFn: () =>
      mobileApiClient.get<{ reports: { id: string }[]; hasMore: boolean }>(
        `/api/jobs/${jobId}/report-conversations?offset=${offset}`
      ),
  });
  return (
    <View>
      <TouchableOpacity
        accessibilityRole='button'
        onPress={() => setOpen(!open)}
      >
        <Text>Resident issue conversations {open ? '−' : '+'}</Text>
      </TouchableOpacity>
      {open && (
        <>
          {query.isPending ? (
            <Text>Loading…</Text>
          ) : query.isError ? (
            <TouchableOpacity onPress={() => void query.refetch()}>
              <Text>Unable to load. Retry</Text>
            </TouchableOpacity>
          ) : (
            <>
              {query.data?.reports.length === 0 && (
                <Text>No linked resident reports.</Text>
              )}
              {query.data?.reports.map((r) => (
                <IssueConversation key={r.id} reportId={r.id} />
              ))}
              <TouchableOpacity
                disabled={offset === 0}
                onPress={() => setOffset(Math.max(0, offset - 25))}
              >
                <Text>Previous reports</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!query.data?.hasMore}
                onPress={() => setOffset(offset + 25)}
              >
                <Text>Next reports</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </View>
  );
}
