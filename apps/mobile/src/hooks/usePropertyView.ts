import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPropertyViewStore, type PropertyView } from '@mintenance/shared';
import { useAuth } from '../contexts/AuthContext';

const store = createPropertyViewStore({
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
});
export function usePropertyView() {
  const { user } = useAuth();
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
