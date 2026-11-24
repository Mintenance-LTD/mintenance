import { useCallback, useSyncExternalStore } from 'react';
import {
  conversationDraftKey,
  createConversationDraftStore,
  type DraftUpdate,
} from '@mintenance/shared';

const drafts = createConversationDraftStore();

export function useConversationDraft(
  userId?: string | null,
  conversationId?: string | null
) {
  const key = conversationDraftKey(userId, conversationId);
  const read = useCallback(() => drafts.read(key), [key]);
  const write = useCallback(
    (value: DraftUpdate) => drafts.write(key, value),
    [key]
  );
  const draft = useSyncExternalStore(drafts.subscribe, read);
  return [draft, write] as const;
}
