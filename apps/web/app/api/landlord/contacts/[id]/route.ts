import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * /api/landlord/contacts/[id]
 *
 * 2026-05-24 audit-30 P2: the per-contact mutation surface that was
 * missing — the list route at /api/landlord/contacts only exported
 * GET + POST, so the contacts UI could add contacts but couldn't
 * correct a typo, swap a wrong phone, deactivate a stale keyholder,
 * or remove a tenant who'd moved on. Both PATCH and DELETE are owner-
 * scoped via the existing property_contacts RLS policy
 * (`owner_id = auth.uid()` for non-admins; admins read), and we also
 * guard server-side here so a service-role-mode failure doesn't
 * silently widen access.
 */

const VALID_ROLES = [
  'tenant',
  'keyholder',
  'emergency_contact',
  'managing_agent',
] as const;

type ContactRole = (typeof VALID_ROLES)[number];

interface PatchBody {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  contact_role?: unknown;
  unit_label?: unknown;
  notes?: unknown;
  move_in_date?: unknown;
  lease_end_date?: unknown;
  is_active?: unknown;
}

const isoDate = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
};

const trimOrNull = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export const PATCH = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const contactId = params.id;
    const body = (await req.json()) as PatchBody;

    // Verify the caller owns this contact before mutating.
    const { data: existing, error: fetchError } = await serverSupabase
      .from('property_contacts')
      .select('id, owner_id')
      .eq('id', contactId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (existing.owner_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name.length === 0) {
        return NextResponse.json(
          { error: 'name cannot be empty' },
          { status: 400 }
        );
      }
      updates.name = name;
    }
    if (body.email !== undefined) updates.email = trimOrNull(body.email);
    if (body.phone !== undefined) updates.phone = trimOrNull(body.phone);
    if (body.unit_label !== undefined)
      updates.unit_label = trimOrNull(body.unit_label);
    if (body.notes !== undefined) updates.notes = trimOrNull(body.notes);
    if (body.move_in_date !== undefined)
      updates.move_in_date = isoDate(body.move_in_date);
    if (body.lease_end_date !== undefined)
      updates.lease_end_date = isoDate(body.lease_end_date);
    if (body.contact_role !== undefined) {
      const role = body.contact_role;
      if (
        typeof role !== 'string' ||
        !VALID_ROLES.includes(role as ContactRole)
      ) {
        return NextResponse.json(
          { error: 'contact_role must be one of: ' + VALID_ROLES.join(', ') },
          { status: 400 }
        );
      }
      updates.contact_role = role;
    }
    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') {
        return NextResponse.json(
          { error: 'is_active must be a boolean' },
          { status: 400 }
        );
      }
      updates.is_active = body.is_active;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updatable fields provided' },
        { status: 400 }
      );
    }

    const { data: contact, error } = await serverSupabase
      .from('property_contacts')
      .update(updates)
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update contact' },
        { status: 500 }
      );
    }

    return NextResponse.json({ contact });
  }
);

export const DELETE = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (_req, { user, params }) => {
    const contactId = params.id;

    const { data: existing, error: fetchError } = await serverSupabase
      .from('property_contacts')
      .select('id, owner_id')
      .eq('id', contactId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (existing.owner_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await serverSupabase
      .from('property_contacts')
      .delete()
      .eq('id', contactId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete contact' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }
);
