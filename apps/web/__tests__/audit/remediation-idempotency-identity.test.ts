// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { rpc } }));
vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));
import { fingerprintMultipartRequest } from '@/lib/api/request-fingerprint';
import {
  checkIdempotency,
  fingerprintRequest,
  getDeterministicIdempotencyKeyFromRequest,
} from '@/lib/idempotency';

describe('request-bound idempotency', () => {
  beforeEach(() => rpc.mockReset());
  it('normalizes object field order but preserves array order and values', () => {
    expect(fingerprintRequest({ b: { y: 2, x: 1 }, a: 3 })).toBe(
      fingerprintRequest({ a: 3, b: { x: 1, y: 2 } })
    );
    expect(fingerprintRequest({ amount: 100 })).not.toBe(
      fingerprintRequest({ amount: 101 })
    );
    expect(fingerprintRequest([1, 2])).not.toBe(fingerprintRequest([2, 1]));
  });
  it('does not truncate long resource identities or confuse separators', () => {
    const request = new Request('https://example.invalid');
    const key = (actor: string, resource: string) =>
      getDeterministicIdempotencyKeyFromRequest(
        request,
        'refund',
        actor,
        resource
      );
    expect(key('actor', 'a'.repeat(300) + '1')).not.toBe(
      key('actor', 'a'.repeat(300) + '2')
    );
    expect(key('actor:resource', 'id')).not.toBe(key('actor', 'resource:id'));
    expect(key('actor', 'resource')).toBe(key('actor', 'resource'));
  });
  it('keeps a supplied key bound to the resource when fallback payload details change', () => {
    const request = new Request('https://example.invalid', {
      headers: { 'idempotency-key': 'retry' },
    });
    const a = getDeterministicIdempotencyKeyFromRequest(
      request,
      'refund',
      'actor',
      'escrow',
      'escrow:100'
    );
    const b = getDeterministicIdempotencyKeyFromRequest(
      request,
      'refund',
      'actor',
      'escrow',
      'escrow:200'
    );
    expect(a).toBe(b); // The claim RPC must reject the changed amount under this same address.
  });
  it('sends the actor and digest, without raw input, to the trusted RPC', async () => {
    rpc.mockResolvedValue({ data: [{ claimed: true }], error: null });
    expect(
      await checkIdempotency('key', 'refund', true, {
        userId: 'actor',
        request: { reason: 'private input', amount: 100 },
      })
    ).toBeNull();
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe('try_claim_bound_idempotency_key');
    expect(args.p_user_id).toBe('actor');
    expect(args.p_request_fingerprint).toBe(
      fingerprintRequest({ amount: 100, reason: 'private input' })
    );
    expect(JSON.stringify(args)).not.toContain('private input');
  });
  it('reports a conflict on an actor or payload mismatch, never a cached result', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'identity mismatch' },
    });
    await expect(
      checkIdempotency('key', 'refund', true, {
        userId: 'actor',
        request: { amount: 101 },
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('multipart retry identity', () => {
  const upload = (content: string, location = '51.5') => {
    const form = new FormData();
    form.append('latitude', location);
    form.append(
      'photos',
      new Blob([content], { type: 'image/png' }),
      'photo.png'
    );
    return new Request('https://example.invalid', {
      method: 'POST',
      body: form,
    });
  };
  it('matches repeated content with new boundaries and leaves the original body readable', async () => {
    const a = upload('synthetic image');
    const b = upload('synthetic image');
    const identity = await fingerprintMultipartRequest(a);
    expect(identity).toEqual(await fingerprintMultipartRequest(b));
    expect((await a.formData()).get('latitude')).toBe('51.5');
  });
  it('distinguishes changed bytes and form values', async () => {
    const identity = await fingerprintMultipartRequest(upload('first'));
    expect(identity).not.toEqual(
      await fingerprintMultipartRequest(upload('second'))
    );
    expect(identity).not.toEqual(
      await fingerprintMultipartRequest(upload('first', '52'))
    );
  });
});
