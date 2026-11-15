export async function collectRows<T>(
  page: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await page(offset, offset + 499);
    if (error)
      throw new Error('Report data could not be loaded. Please retry.');
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}
