/**
 * Property team invitations — the invitee's side.
 *
 * GET  /api/properties/invites            list invites addressed to me
 * POST /api/properties/invites            { inviteId, action: accept|decline }
 *
 * Until now there was no invitee side at all. `POST /api/properties/[id]/team`
 * wrote a `pending` row, an email went out, and that was the end of it: the
 * only RLS policy on property_team_members was owner-scoped, so the invited
 * person could not read the row addressed to them, and no route existed to
 * accept it. The team UI even shipped a fallback message reading "Invite
 * recorded — activation pathway pending". Production holds zero team rows.
 *
 * Invites here are matched by EMAIL rather than by a token (there is no token
 * column), so there is no link to leak — the invitee signs in and sees invites
 * addressed to their own verified address. The email is compared against the
 * `profiles` row rather than the JWT claim, matching
 * /api/organizations/accept-invite.
 *
 * Writes run with the service role even though the caller is acting on their
 * own row: the RLS write policies are owner-only on purpose, because an
 * invitee able to UPDATE their own membership could also rewrite `role` and
 * make themselves an admin of someone else's property.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';

const SERVICE = 'property-invites';

const respondSchema = z
  .object({
    inviteId: z.string().uuid(),
    action: z.enum(['accept', 'decline']),
  })
  .strict();

/** The caller's canonical email — profiles is ground truth, JWT is a fallback. */
async function callerEmail(userId: string, fallback?: string | null) {
  const { data } = await serverSupabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();
  return ((data?.email as string | null) || fallback || '').toLowerCase();
}

/** supabase-js returns a many-to-one embed as an object, but has historically
 *  been read as an array in this codebase — handle both rather than assume. */
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type EmbeddedProperty = {
  id: string;
  property_name: string;
  address: string;
};

interface InviteRow {
  id: string;
  role: string;
  status: string;
  email: string;
  created_at: string;
  property_id: string;
  properties: EmbeddedProperty | EmbeddedProperty[] | null;
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 }, csrf: false },
  async (_request, { user }) => {
    const email = await callerEmail(user.id, user.email);
    if (!email) {
      return NextResponse.json({ invites: [] });
    }

    const { data, error } = await serverSupabase
      .from('property_team_members')
      .select(
        'id, role, status, email, created_at, property_id, ' +
          'properties:property_id (id, property_name, address)'
      )
      .eq('status', 'pending')
      .or(`user_id.eq.${user.id},email.ilike.${email}`)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to list property invites', error, {
        service: SERVICE,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to load invitations' },
        { status: 500 }
      );
    }

    // The generated types don't narrow a `.or()` query carrying an embed, so
    // the row shape is asserted here rather than fought with generics.
    const rows = (data || []) as unknown as InviteRow[];

    const invites = rows.map((row) => {
      const property = firstOf(row.properties);
      return {
        id: row.id,
        role: row.role,
        invitedEmail: row.email,
        createdAt: row.created_at,
        propertyId: row.property_id,
        propertyName: property?.property_name ?? 'A property',
        propertyAddress: property?.address ?? null,
      };
    });

    return NextResponse.json({ invites });
  }
);

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const parsed = respondSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: parsed.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    const { inviteId, action } = parsed.data;

    const { data: invite } = await serverSupabase
      .from('property_team_members')
      .select('id, property_id, email, role, status, user_id')
      .eq('id', inviteId)
      .maybeSingle();

    if (!invite) {
      throw new BadRequestError('Invitation not found');
    }
    if (invite.status !== 'pending') {
      throw new BadRequestError(`Invitation was already ${invite.status}`);
    }

    const email = await callerEmail(user.id, user.email);
    const addressedToCaller =
      invite.user_id === user.id ||
      (email.length > 0 && (invite.email as string).toLowerCase() === email);

    if (!addressedToCaller) {
      throw new ForbiddenError(
        'This invitation was sent to a different email address'
      );
    }

    // `role` is deliberately not read from the request — it is whatever the
    // property owner set when inviting.
    const { error } = await serverSupabase
      .from('property_team_members')
      .update({
        status: action === 'accept' ? 'accepted' : 'declined',
        // Bind the row to the account that accepted it so later lookups do
        // not have to re-match on email.
        user_id: action === 'accept' ? user.id : invite.user_id,
      })
      .eq('id', inviteId)
      // Guard against two concurrent responses racing past the status check.
      .eq('status', 'pending');

    if (error) {
      logger.error('Failed to respond to property invite', error, {
        service: SERVICE,
        userId: user.id,
        inviteId,
        action,
      });
      return NextResponse.json(
        { error: 'Failed to update the invitation' },
        { status: 500 }
      );
    }

    logger.info('Property invite answered', {
      service: SERVICE,
      userId: user.id,
      inviteId,
      propertyId: invite.property_id,
      action,
    });

    return NextResponse.json({
      success: true,
      status: action === 'accept' ? 'accepted' : 'declined',
      propertyId: invite.property_id,
      role: invite.role,
    });
  }
);
