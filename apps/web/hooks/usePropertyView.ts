'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { createPropertyViewStore, type PropertyView } from '@mintenance/shared';
import { useCurrentUser } from './useCurrentUser';

const store = createPropertyViewStore({
  get: async (key) => window.localStorage.getItem(key),
  set: async (key, value) => {
    window.localStorage.setItem(key, value);
  },
});
export function usePropertyView() {
  const { user } = useCurrentUser();
  const id = user?.role === 'homeowner' ? user.id : undefined;
  const state = useSyncExternalStore(
    store.subscribe,
    () => store.snapshot(id),
    store.serverSnapshot
  );
  useEffect(() => {
    if (id) void store.load(id);
  }, [id]);
  return {
    ...state,
    enabled: !!id,
    setView: (view: PropertyView) => {
      if (id) void store.set(id, view);
    },
  };
}
