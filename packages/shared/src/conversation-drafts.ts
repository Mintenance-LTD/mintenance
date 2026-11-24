interface DraftStorage {
  read: (key: string) => string | null;
  write: (key: string, value: string) => void;
}

export type DraftUpdate = string | ((current: string) => string);

export function conversationDraftKey(
  userId?: string | null,
  conversationId?: string | null
) {
  return userId && conversationId
    ? JSON.stringify([userId, conversationId])
    : null;
}

export function createConversationDraftStore(storage?: DraftStorage) {
  const memory = new Map<string, string>();
  const subscribers = new Set<() => void>();

  function read(key: string | null) {
    if (!key) return '';
    if (memory.has(key)) return memory.get(key) ?? '';
    try {
      return storage?.read(key) ?? '';
    } catch {
      return '';
    }
  }

  return {
    read,
    subscribe(listener: () => void) {
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },
    write(key: string | null, update: DraftUpdate) {
      if (!key) return;
      const current = read(key);
      const value = typeof update === 'function' ? update(current) : update;
      if (value === current) return;

      if (storage) {
        try {
          storage.write(key, value);
          memory.delete(key);
        } catch {
          memory.set(key, value);
        }
      } else if (value) {
        memory.set(key, value);
      } else {
        memory.delete(key);
      }
      subscribers.forEach((listener) => listener());
    },
  };
}
