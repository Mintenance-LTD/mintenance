import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: mocks.rpc },
}));
import { saveProperty } from '@/lib/properties/save-property';

describe('property save attachment contract', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:55321');
    mocks.rpc.mockResolvedValue({ data: { id: 'property' }, error: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('passes verified actor and deduplicated exact-origin object paths to one atomic operation', async () => {
    const fields = {
      property_name: 'Synthetic',
      photos: [
        'http://127.0.0.1:55321/storage/v1/object/sign/Job-storage/property-photos/owner/photo.jpg?token=old',
        'property-photos/owner/photo.jpg',
        'https://foreign.example/storage/v1/object/sign/Job-storage/other/private.jpg',
      ],
    };
    expect(await saveProperty('owner', 'property', fields, true)).toEqual({
      id: 'property',
    });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      'save_property_with_photo_bindings',
      {
        p_actor_id: 'owner',
        p_property_id: 'property',
        p_fields: fields,
        p_paths: ['property-photos/owner/photo.jpg'],
        p_create: true,
      }
    );
  });

  it('keeps photo omission distinct from an explicit removal', async () => {
    await saveProperty('manager', 'property', { property_name: 'Renamed' });
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({
      p_fields: { property_name: 'Renamed' },
      p_paths: [],
      p_create: false,
    });
    expect(mocks.rpc.mock.calls[0][1].p_fields).not.toHaveProperty('photos');
    await saveProperty('manager', 'property', { photos: [] });
    expect(mocks.rpc.mock.calls[1][1]).toMatchObject({
      p_fields: { photos: [] },
      p_paths: [],
    });
  });

  it.each([
    ['42501', 'Remove unavailable photos'],
    ['P0002', 'Property not found'],
    ['22023', 'Some property details are invalid'],
    ['23514', 'Some property details are invalid'],
  ])(
    'surfaces actionable failure for %s without reporting success',
    async (code, message) => {
      mocks.rpc.mockResolvedValue({ data: null, error: { code } });
      await expect(saveProperty('owner', 'property', {})).rejects.toThrow(
        message
      );
      expect(mocks.rpc).toHaveBeenCalledTimes(1);
    }
  );

  it('does not turn a missing database result into success', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await expect(saveProperty('owner', 'property', {})).rejects.toThrow(
      'no record'
    );
  });
});
