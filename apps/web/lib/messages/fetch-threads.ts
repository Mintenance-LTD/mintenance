/** Fresh cursor state per refresh; never replace the inbox with a partial success. */
export async function fetchAllMessageThreads<T>(): Promise<T[]> {
  const threads = new Map<string, T>();
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const response = await fetch(
      cursor
        ? '/api/messages/threads?cursor=' + encodeURIComponent(cursor)
        : '/api/messages/threads',
      { credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to fetch conversations');
    const page = await response.json();
    for (const thread of page.threads ?? [])
      if (!threads.has(thread.jobId)) threads.set(thread.jobId, thread);
    cursor = page.nextCursor;
    if (cursor && seen.has(cursor))
      throw new Error('Inbox pagination did not advance');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return [...threads.values()];
}
