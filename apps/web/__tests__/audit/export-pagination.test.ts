// @vitest-environment node
import { expect, it, vi } from 'vitest';
vi.unmock('@supabase/supabase-js');
import { createClient } from '@supabase/supabase-js';
import { readExportRows } from '@/lib/privacy/read-export-rows';

const rows = Array.from({ length: 1203 }, (_, i) => ({
  id: String(i).padStart(6, '0'),
  owner_id: 'subject',
}));
function fixture(failPage = 0) {
  const requests: URL[] = [];
  const db = createClient('https://synthetic.invalid', 'synthetic-key', {
    global: {
      fetch: async (input) => {
        const url = new URL(String(input));
        requests.push(url);
        if (requests.length === failPage)
          return new Response('unavailable', { status: 503 });
        // Simulate a server cap lower than the requested 500, with real SDK requests.
        const cursor = url.searchParams.get('id')?.replace('gt.', '');
        const page = rows
          .filter((row) => !cursor || row.id > cursor)
          .slice(0, 200);
        return new Response(JSON.stringify(page), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  });
  return {
    requests,
    run: () =>
      readExportRows(() =>
        db.from('properties').select('*').eq('owner_id', 'subject')
      ),
  };
}
it('exports beyond the server cap and retains the subject filter on every page', async () => {
  const f = fixture();
  const result = await f.run();
  expect(result.error).toBeNull();
  expect(result.data).toEqual(rows);
  expect(f.requests).toHaveLength(8);
  for (const request of f.requests) {
    expect(request.searchParams.get('owner_id')).toBe('eq.subject');
    expect(request.searchParams.get('order')).toBe('id.asc');
  }
});
it('discards all partial rows when a later page fails', async () => {
  const result = await fixture(3).run();
  expect(result.data).toBeNull();
  expect(result.error).not.toBeNull();
});
it('rejects a repeated page instead of looping or producing duplicate records', async () => {
  const db = createClient('https://synthetic.invalid', 'synthetic-key', {
    global: { fetch: async () => new Response(JSON.stringify([rows[0]])) },
  });
  const result = await readExportRows(() =>
    db.from('properties').select('*').eq('owner_id', 'subject')
  );
  expect(result.data).toBeNull();
  expect(result.error?.message).toContain('pagination');
});
