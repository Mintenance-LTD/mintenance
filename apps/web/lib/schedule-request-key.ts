'use client';

// Keep only a digest and random request identity, never form contents.
export async function scheduleRequest(scope: string, payload: unknown) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const fingerprint = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
  const storageKey = `schedule-request:${scope}:${fingerprint}`;
  const key = sessionStorage.getItem(storageKey) || crypto.randomUUID();
  sessionStorage.setItem(storageKey, key);
  return { key, complete: () => sessionStorage.removeItem(storageKey) };
}
