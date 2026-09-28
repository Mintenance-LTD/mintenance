import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';

type ContactDetails = {
  name: string;
  email?: string;
  phone?: string;
  lease_start?: string;
  lease_end?: string;
  notes?: string;
};

// The existing primary key supplies the atomic uniqueness constraint. Scope the
// operation to its actor and property so a caller cannot choose another row ID.
export function contactSaveId(
  actor: string,
  property: string,
  operation: string
) {
  const hex = createHash('sha256')
    .update(JSON.stringify([actor, property, operation]))
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// Call only AFTER current manage_contacts authorization, including on replay.
export async function recoverContactSave(
  id: string | undefined,
  property: string,
  details: ContactDetails
) {
  if (!id) return null;
  const { data: tenant, error } = await serverSupabase
    .from('property_tenants')
    .select(
      'id, property_id, name, email, phone, lease_start, lease_end, notes, is_active, invitation_sent_at, invitation_accepted_at, user_id'
    )
    .eq('id', id)
    .eq('property_id', property)
    .maybeSingle();
  if (error) throw new Error('Contact save could not be checked');
  if (!tenant) {
    const { data: consumed, error: lookupError } = await serverSupabase
      .from('property_contact_save_ids')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (lookupError) throw new Error('Contact save could not be checked');
    if (consumed)
      return NextResponse.json(
        {
          error:
            'This contact was already saved and has since been removed. Discard the pending draft and refresh your contacts.',
        },
        { status: 410 }
      );
    return null;
  }
  const expected = {
    ...details,
    email: details.email?.trim().toLowerCase() || null,
  };
  const fields = [
    'name',
    'email',
    'phone',
    'lease_start',
    'lease_end',
    'notes',
  ] as const;
  if (
    !tenant.is_active ||
    fields.some(
      (field) => (tenant[field] || null) !== (expected[field] || null)
    )
  ) {
    return NextResponse.json(
      {
        error:
          'This save was already used with different contact details. Refresh the contacts before continuing.',
      },
      { status: 409 }
    );
  }
  return NextResponse.json({
    tenant,
    recovered: true,
    invitation_status: tenant.invitation_sent_at
      ? 'sent'
      : tenant.email && !tenant.user_id
        ? 'unconfirmed'
        : 'not_requested',
  });
}
