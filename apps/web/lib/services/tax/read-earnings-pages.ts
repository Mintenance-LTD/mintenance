/** Read through the API row cap; do not treat a short page as end-of-data. */
export async function readEarningsPages<T extends { id: string }>(
  page: (
    after: string | null
  ) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<{ data: T[] | null; error: unknown }> {
  const rows: T[] = [];
  let after: string | null = null;
  while (true) {
    const result = await page(after);
    if (result.error) return { data: null, error: result.error };
    if (!result.data)
      return { data: null, error: new Error('Missing earnings page') };
    if (result.data.length === 0) return { data: rows, error: null };
    for (const row of result.data) {
      if (!row.id || (after !== null && row.id <= after)) {
        return {
          data: null,
          error: new Error('Earnings cursor did not advance'),
        };
      }
      rows.push(row);
      after = row.id;
    }
  }
}
