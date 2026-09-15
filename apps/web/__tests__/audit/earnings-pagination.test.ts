import { describe, expect, it, vi } from 'vitest';
import { readEarningsPages } from '@/lib/services/tax/read-earnings-pages';

describe('earnings page completeness', () => {
  it('continues through short server-capped pages until an empty page', async () => {
    const rows = Array.from({ length: 1205 }, (_, i) => ({
      id: String(i).padStart(8, '0'),
    }));
    const page = vi.fn(async (after: string | null) => ({
      data: rows
        .filter((row) => after === null || row.id > after)
        .slice(0, 137),
      error: null,
    }));
    expect(await readEarningsPages(page)).toEqual({ data: rows, error: null });
    expect(page).toHaveBeenCalledTimes(10);
  });
  it('discards incomplete totals when a later page fails', async () => {
    const failure = { message: 'connection lost' };
    const page = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: 'a' }], error: null })
      .mockResolvedValueOnce({ data: null, error: failure });
    expect(await readEarningsPages(page)).toEqual({
      data: null,
      error: failure,
    });
  });
  it('fails instead of looping or double-counting when the cursor is ignored', async () => {
    const result = await readEarningsPages(async () => ({
      data: [{ id: 'a' }],
      error: null,
    }));
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });
});
