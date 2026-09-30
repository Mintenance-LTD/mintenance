type Row = Record<string, unknown>;
type Result = { data: Row[] | null; error: { message: string } | null };
interface Query extends PromiseLike<Result> {
  order(column: string, options: { ascending: boolean }): Query;
  gt(column: string, value: string): Query;
  limit(count: number): Query;
}

/** Rebuild the scoped query on each page. Never interpret a server row cap as EOF. */
export async function readExportRows(makeQuery: () => Query): Promise<Result> {
  const rows: Row[] = [];
  let cursor: string | undefined;
  try {
    for (;;) {
      let query = makeQuery().order('id', { ascending: true }).limit(500);
      if (cursor) query = query.gt('id', cursor);
      const { data, error } = await query;
      if (error || !data)
        return {
          data: null,
          error: error ?? { message: 'Missing export page' },
        };
      if (!data.length) return { data: rows, error: null };
      for (const row of data) {
        if (typeof row.id !== 'string' || (cursor && row.id <= cursor)) {
          return {
            data: null,
            error: { message: 'Invalid export pagination' },
          };
        }
        cursor = row.id;
        rows.push(row);
      }
      // Bound synchronous memory use; fail rather than provide a truncated download.
      if (rows.length > 100_000)
        return {
          data: null,
          error: { message: 'Export requires offline processing' },
        };
    }
  } catch {
    return { data: null, error: { message: 'Export page unavailable' } };
  }
}
