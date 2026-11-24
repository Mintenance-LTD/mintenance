'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  conversationDraftKey,
  createConversationDraftStore,
  type DraftUpdate,
} from '@mintenance/shared';

const prefix = 'mintenance:message-draft:v1:';
const drafts = createConversationDraftStore({
  read: (key) => window.sessionStorage.getItem(prefix + key),
  write: (key, value) => {
    if (value) window.sessionStorage.setItem(prefix + key, value);
    else window.sessionStorage.removeItem(prefix + key);
  },
});
const emptyDraft = () => '';

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
  const draft = useSyncExternalStore(drafts.subscribe, read, emptyDraft);
  return [draft, write] as const;
}
