import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  authorize: vi.fn(),
  actor: { id: 'manager', role: 'homeowner' },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: mocks.rpc },
  createRequestScopedClient: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (
      _options: unknown,
      handler: (
        request: Request,
        context: { user: typeof mocks.actor; params: { id: string } }
      ) => Promise<Response>
    ) =>
    (request: Request) =>
      handler(request, { user: mocks.actor, params: { id: 'property' } }),
}));
vi.mock('@/lib/services/property-team/PropertyTeamService', () => ({
  PropertyTeamService: { authorize: mocks.authorize },
}));
import { PUT } from '@/app/api/properties/[id]/route';

describe('property edit response and attachment persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.id = 'manager';
    mocks.actor.role = 'homeowner';
    mocks.authorize.mockResolvedValue({ authorized: true, role: 'manager' });
    mocks.rpc.mockResolvedValue({
      data: {
        id: 'property',
        owner_id: 'owner',
        property_name: 'Renamed',
        key_safe_code: 'synthetic-entry-code',
      },
      error: null,
    });
  });
  const request = () =>
    new NextRequest('http://localhost/api/properties/property', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed' }),
    });

  it('routes a manager edit through the atomic save without returning the entry code', async () => {
    const response = await PUT(request(), {
      params: Promise.resolve({ id: 'property' }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { key_safe_code: null },
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      'save_property_with_photo_bindings',
      expect.objectContaining({
        p_actor_id: 'manager',
        p_property_id: 'property',
        p_fields: expect.objectContaining({ property_name: 'Renamed' }),
        p_paths: [],
        p_create: false,
      })
    );
  });

  it('retains owner access to the entry code', async () => {
    mocks.actor.id = 'owner';
    const response = await PUT(request(), {
      params: Promise.resolve({ id: 'property' }),
    });
    expect(await response.json()).toMatchObject({
      data: { key_safe_code: 'synthetic-entry-code' },
    });
  });

  it('rejects denied edits before invoking the save operation', async () => {
    mocks.authorize.mockResolvedValue({ authorized: false });
    await expect(
      PUT(request(), { params: Promise.resolve({ id: 'property' }) })
    ).rejects.toThrow('permission');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
