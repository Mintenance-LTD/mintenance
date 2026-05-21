import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

/**
 * POST /api/tenant-invite/accept
 * Accept a tenant invitation and link the authenticated user's account
 * to the property. Called after registration with ?invite=TOKEN.
 */
export const POST = withApiHandler({ csrf: false }, async (req, { user }) => {
  const { token } = await req.json();

  if (!token) {
    return NextResponse.json(
      { error: 'Invitation token is required' },
      { status: 400 }
    );
  }

  // Find the invitation
  const { data: tenant, error: findError } = await serverSupabase
    .from('property_tenants')
    .select('id, property_id, name, email, user_id, invitation_accepted_at')
    .eq('invitation_token', token)
    .eq('is_active', true)
    .maybeSingle();

  if (findError || !tenant) {
    return NextResponse.json(
      { error: 'Invalid or expired invitation' },
      { status: 404 }
    );
  }

  // Already accepted
  if (tenant.invitation_accepted_at) {
    return NextResponse.json(
      {
        error: 'This invitation has already been accepted',
        property_id: tenant.property_id,
      },
      { status: 409 }
    );
  }

  // Link the user to the property
  const { error: updateError } = await serverSupabase
    .from('property_tenants')
    .update({
      user_id: user.id,
      invitation_accepted_at: new Date().toISOString(),
    })
    .eq('id', tenant.id);

  if (updateError) {
    logger.error('Failed to accept tenant invitation', { error: updateError });
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }

  // Get property details for the notification.
  // Column is `property_name` in the DB; aliasing it to `name` here so the
  // downstream notification template at `${property.address || property.name}`
  // continues to render. Selecting the literal `name` column was rejected
  // by PostgREST (column does not exist) — the same root cause as the
  // /api/properties/[id]/tenants HTTP 500 fix.
  const { data: property } = await serverSupabase
    .from('properties')
    .select('id, address, owner_id, name:property_name')
    .eq('id', tenant.property_id)
    .single();

  // Notify the property owner. Prior direct insert used the
  // nonexistent `data` column — the entire INSERT was rejected, so
  // owners never got the "tenant accepted" notification.
  if (property?.owner_id) {
    // 2026-05-21 Mint Editorial voice.
    await NotificationService.createNotification({
      userId: property.owner_id,
      type: 'tenant_accepted',
      title: `${tenant.name} joined ${property.address || property.name || 'your property'}`,
      message: `They can now report issues directly — you'll be in the loop on every job.`,
      actionUrl: `/properties/${tenant.property_id}`,
      metadata: { property_id: tenant.property_id, tenant_id: tenant.id },
    });
  }

  logger.info('Tenant invitation accepted', {
    tenantId: tenant.id,
    userId: user.id,
    propertyId: tenant.property_id,
  });

  return NextResponse.json({
    success: true,
    property_id: tenant.property_id,
    message: `You've been linked to ${property?.address || 'the property'}. You can now submit maintenance requests.`,
  });
});
