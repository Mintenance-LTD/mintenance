import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineQuery } from './useOfflineQuery';
import { queryKeys } from '../lib/queryClient';
import { getJobMessagesPage } from '../services/messaging/MessageFetcher';
import type { Message } from '../services/messaging/types';

function mergeMessages(older: Message[], newer: Message[]): Message[] {
  const messages = new Map(older.map((message) => [message.id, message]));
  newer.forEach((message) => messages.set(message.id, message));
  return [...messages.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
}

/** Keep the existing array cache shared by realtime and optimistic sends. */
export function usePagedJobMessages(jobId: string) {
  const client = useQueryClient();
  const [pagination, setPagination] = useState<{
    jobId: string;
    cursor?: string;
    initialized?: boolean;
  }>({ jobId });
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const busy = useRef(false);
  const currentJob = useRef(jobId);
  currentJob.current = jobId;
  const key = queryKeys.messages.conversation(jobId);
  const query = useOfflineQuery<Message[]>({
    queryKey: key,
    enabled: !!jobId,
    staleTime: 0,
    queryFn: async () => {
      const page = await getJobMessagesPage(jobId);
      if (currentJob.current !== jobId) return page.messages;
      setPagination((previous) =>
        previous.jobId === jobId && previous.initialized
          ? previous
          : { jobId, cursor: page.nextCursor, initialized: true }
      );
      // Refresh only the newest page without discarding older pages already opened.
      return mergeMessages(
        client.getQueryData<Message[]>(key) ?? [],
        page.messages
      );
    },
  });
  const cursor = pagination.jobId === jobId ? pagination.cursor : undefined;
  const loadOlder = async () => {
    if (!cursor || busy.current) return;
    busy.current = true;
    setLoadingOlder(true);
    setOlderError(false);
    try {
      const page = await getJobMessagesPage(jobId, cursor);
      if (currentJob.current !== jobId) return;
      if (page.nextCursor === cursor)
        throw new Error('Message pagination did not advance');
      client.setQueryData<Message[]>(key, (current) =>
        mergeMessages(page.messages, current ?? [])
      );
      setPagination({ jobId, cursor: page.nextCursor, initialized: true });
    } catch {
      if (currentJob.current === jobId) setOlderError(true);
    } finally {
      busy.current = false;
      setLoadingOlder(false);
    }
  };
  return { ...query, hasOlder: !!cursor, loadOlder, loadingOlder, olderError };
}
