import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
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
    <View
      style={{
        margin: 16,
        padding: 16,
        borderRadius: 18,
        backgroundColor: me.surface,
        borderWidth: 1,
        borderColor: me.line,
      }}
    >
      <TouchableOpacity
        accessibilityRole='button'
        accessibilityState={{ expanded: open }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 48,
        }}
        onPress={() => setOpen(!open)}
      >
        <Ionicons name='chatbubbles-outline' size={22} color={me.brand} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: me.ink, fontSize: 16 }}>
            Resident updates
          </Text>
          <Text style={{ color: me.ink2, marginTop: 4 }}>
            Reports and conversations linked to this job
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={me.ink2}
        />
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
                <Text style={{ color: me.ink2, paddingVertical: 16 }}>
                  No resident reports are linked to this job yet.
                </Text>
              )}
              {query.data?.reports.map((r) => (
                <IssueConversation key={r.id} reportId={r.id} />
              ))}
              {(offset > 0 || query.data?.hasMore) && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 12,
                  }}
                >
                  <TouchableOpacity
                    style={{ padding: 12, opacity: offset === 0 ? 0.4 : 1 }}
                    disabled={offset === 0}
                    onPress={() => setOffset(Math.max(0, offset - 25))}
                  >
                    <Text>Previous reports</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      padding: 12,
                      opacity: query.data?.hasMore ? 1 : 0.4,
                    }}
                    disabled={!query.data?.hasMore}
                    onPress={() => setOffset(offset + 25)}
                  >
                    <Text>Next reports</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}
