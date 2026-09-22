/** Property invitations bind the selected role to the verified invitee.
 * Service-role writes are restricted to the pending row and never accept a role from the client.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';
import {
  BadRequestError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
} from '@/lib/errors/api-error';

const SERVICE = 'property-invites';

const respondSchema = z
  .object({
    inviteId: z.string().uuid(),
    action: z.enum(['accept', 'decline']),
  })
  .strict();

/** Email-based access must use the auth provider's verified identity. */
async function callerEmail(userId: string) {
  const { data, error } = await serverSupabase.auth.admin.getUserById(userId);
  if (error || !data.user)
    throw new InternalServerError(
      'Unable to verify invitation identity. Please retry.'
    );
  return data.user.email_confirmed_at
    ? (data.user.email ?? '').toLowerCase()
    : '';
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
    const email = await callerEmail(user.id);
    const query = () =>
      serverSupabase
        .from('property_team_members')
        .select(
          'id, role, status, email, created_at, property_id, properties:property_id (id, property_name, address)'
        )
        .eq('status', 'pending');
    // Separate filters avoid interpolating an email into PostgREST's OR syntax.
    // Escape LIKE wildcards so addresses containing % or _ only match literally.
    const [byUser, byEmail] = await Promise.all([
      query().eq('user_id', user.id).order('created_at', { ascending: false }),
      email
        ? query()
            .ilike('email', email.replace(/[\\%_]/g, '\\$&'))
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    const error = byUser.error || byEmail.error;
    const data = [
      ...new Map(
        [...(byUser.data ?? []), ...(byEmail.data ?? [])].map((row) => [
          row.id,
          row,
        ])
      ).values(),
    ];

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

    const { data: invite, error: lookupError } = await serverSupabase
      .from('property_team_members')
      .select('id, property_id, email, role, status, user_id')
      .eq('id', inviteId)
      .maybeSingle();

    if (lookupError)
      throw new InternalServerError(
        'Unable to load the invitation. Please retry.'
      );
    if (!invite) {
      throw new BadRequestError('Invitation not found');
    }
    if (invite.status !== 'pending') {
      throw new BadRequestError(`Invitation was already ${invite.status}`);
    }

    const email = await callerEmail(user.id);
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
    const { data: updated, error } = await serverSupabase
      .from('property_team_members')
      .update({
        status: action === 'accept' ? 'accepted' : 'declined',
        // Bind the row to the account that accepted it so later lookups do
        // not have to re-match on email.
        user_id: action === 'accept' ? user.id : invite.user_id,
      })
      .eq('id', inviteId)
      // Guard against two concurrent responses racing past the status check.
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

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

    if (!updated)
      throw new ConflictError(
        'Invitation changed. Refresh before responding again.'
      );

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
