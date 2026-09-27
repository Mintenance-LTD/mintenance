import * as SecureStore from 'expo-secure-store';

// Keep the pending payload encrypted, and preserve its operation identity across
// process death. The checksum is only a storage index; equality is checked below.
export async function scheduleRequest(scope: string, payload: unknown) {
  const serialized = JSON.stringify(payload);
  let checksum = 2166136261;
  for (let i = 0; i < serialized.length; i++)
    checksum = Math.imul(checksum ^ serialized.charCodeAt(i), 16777619);
  const storageKey = `schedule-request.${scope.replace(/[^a-zA-Z0-9_.-]/g, '_')}.${checksum >>> 0}.${serialized.length}`;
  const saved = await SecureStore.getItemAsync(storageKey);
  if (saved) {
    const pending = JSON.parse(saved) as { payload: string; key: string };
    if (pending.payload !== serialized)
      throw new Error(
        'A pending task has conflicting details. Reload your schedules before retrying.'
      );
    return {
      key: pending.key,
      complete: () => SecureStore.deleteItemAsync(storageKey),
    };
  }
  // This is a scoped deduplication identifier, never a credential or access token.
  const key = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const value = Math.floor(Math.random() * 16);
    return (c === 'x' ? value : (value & 3) | 8).toString(16);
  });
  await SecureStore.setItemAsync(
    storageKey,
    JSON.stringify({ payload: serialized, key })
  );
  return { key, complete: () => SecureStore.deleteItemAsync(storageKey) };
}
