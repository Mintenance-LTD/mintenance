import { beforeEach, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { rpc } }));
import { readPropertyEntrySecret } from '@/lib/services/property-entry-secret';
beforeEach(() => vi.resetAllMocks());
it('binds property, authenticated actor and optional job to the restricted RPC', async () => {
  rpc.mockResolvedValue({ data: 'synthetic-code', error: null });
  expect(await readPropertyEntrySecret('property', 'actor', 'job')).toBe('synthetic-code');
  expect(rpc).toHaveBeenCalledWith('read_property_entry_secret', {
    p_property_id: 'property', p_actor_id: 'actor', p_job_id: 'job',
  });
});
it('preserves a denied or missing secret as null', async () => {
  rpc.mockResolvedValue({ data: null, error: null });
  expect(await readPropertyEntrySecret('property', 'actor')).toBeNull();
  expect(rpc).toHaveBeenCalledWith('read_property_entry_secret', expect.objectContaining({ p_job_id: null }));
});
it('does not silently hide a database failure or expose its details', async () => {
  rpc.mockResolvedValue({ data: null, error: { message: 'sensitive provider details' } });
  await expect(readPropertyEntrySecret('property', 'actor')).rejects.toThrow('Unable to load property entry details');
});
