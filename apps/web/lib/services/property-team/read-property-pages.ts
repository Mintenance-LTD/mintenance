export const propertyPageSize = 500;

/** Read a scoped list in stable ID order without inheriting PostgREST's row cap. */
export async function readPropertyPages<T extends { id: string }>(
  fetchPage: (
    after: string | null
  ) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  let after: string | null = null;
  for (;;) {
    const { data, error } = await fetchPage(after);
    if (error || !data)
      throw new InternalServerError(
        'Could not load the complete property list'
      );
    rows.push(...data);
    if (data.length < propertyPageSize) return rows;
    const next = data.at(-1)?.id;
    if (!next || next === after)
      throw new InternalServerError('Property list cursor did not advance');
    after = next;
  }
}

export function primaryAndNewestFirst(
  a: { id: string; is_primary?: boolean | null; created_at?: string | null },
  b: { id: string; is_primary?: boolean | null; created_at?: string | null }
): number {
  return (
    Number(!!b.is_primary) - Number(!!a.is_primary) ||
    (b.created_at ?? '').localeCompare(a.created_at ?? '') ||
    a.id.localeCompare(b.id)
  );
}
import { InternalServerError } from '@/lib/errors/api-error';
