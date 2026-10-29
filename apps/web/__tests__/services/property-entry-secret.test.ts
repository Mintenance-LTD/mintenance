import { beforeEach, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
const logError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { rpc } }));
vi.mock('@/lib/logger', () => ({ logger: { error: logError } }));
import {
  readPropertyEntrySecret,
  readPropertyEntryForDisplay,
  PropertyEntryUnavailableError,
} from '@/lib/services/property-entry-secret';
beforeEach(() => vi.resetAllMocks());
it('binds property, authenticated actor and optional job to the restricted RPC', async () => {
  rpc.mockResolvedValue({ data: 'synthetic-code', error: null });
  expect(await readPropertyEntrySecret('property', 'actor', 'job')).toBe(
    'synthetic-code'
  );
  expect(rpc).toHaveBeenCalledWith('read_property_entry_secret', {
    p_property_id: 'property',
    p_actor_id: 'actor',
    p_job_id: 'job',
  });
});
it('preserves a denied or missing secret as null', async () => {
  rpc.mockResolvedValue({ data: null, error: null });
  expect(await readPropertyEntrySecret('property', 'actor')).toBeNull();
  expect(rpc).toHaveBeenCalledWith(
    'read_property_entry_secret',
    expect.objectContaining({ p_job_id: null })
  );
});
it('does not silently hide a database failure or expose its details', async () => {
  rpc.mockResolvedValue({
    data: null,
    error: { message: 'sensitive provider details' },
  });
  await expect(readPropertyEntrySecret('property', 'actor')).rejects.toThrow(
    'Unable to load property entry details'
  );
});
it('retains a safe diagnostic code but excludes provider details and data on failure', async () => {
  rpc.mockResolvedValue({
    data: 'must-not-leak',
    error: { code: 'PGRST202', message: 'private backend details' },
  });
  await expect(
    readPropertyEntrySecret('property', 'actor')
  ).rejects.toMatchObject({
    name: 'PropertyEntryUnavailableError',
    databaseCode: 'PGRST202',
    message: 'Unable to load property entry details',
  });
  expect(await readPropertyEntryForDisplay('property', 'actor')).toEqual({
    code: null,
    unavailable: true,
  });
  expect(logError).toHaveBeenCalledWith('Property entry lookup unavailable', {
    service: 'property-entry-secret',
    databaseCode: 'PGRST202',
  });
  expect(JSON.stringify(logError.mock.calls)).not.toContain(
    'private backend details'
  );
  expect(JSON.stringify(logError.mock.calls)).not.toContain('must-not-leak');
});
it('distinguishes a denied/missing secret from a failed lookup', async () => {
  rpc.mockResolvedValue({ data: null, error: null });
  expect(await readPropertyEntryForDisplay('property', 'actor')).toEqual({
    code: null,
    unavailable: false,
  });
  expect(logError).not.toHaveBeenCalled();
});
it('contains transport failures on pages but keeps API callers fail-closed', async () => {
  rpc.mockRejectedValue(new Error('sensitive transport details'));
  await expect(
    readPropertyEntrySecret('property', 'actor')
  ).rejects.toBeInstanceOf(PropertyEntryUnavailableError);
  expect(await readPropertyEntryForDisplay('property', 'actor')).toEqual({
    code: null,
    unavailable: true,
  });
  expect(logError).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ databaseCode: 'UNKNOWN' })
  );
});
