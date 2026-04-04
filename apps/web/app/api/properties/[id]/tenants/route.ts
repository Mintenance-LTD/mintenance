import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { EmailService } from '@/lib/email-service';
import { logger } from '@mintenance/shared';

/**
 * GET /api/properties/[id]/tenants
 * List all tenants for a property (owner or linked tenant can view)
 */
export const GET = withApiHandler(
  { csrf: false },
  async (_req, { user, params }) => {
    const propertyId = params.id;

    // Check ownership or tenant linkage
    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const isOwner = property.owner_id === user.id || user.role === 'admin';
    const { data: tenantLink } = !isOwner
      ? await serverSupabase
          .from('property_tenants')
          .select('id')
          .eq('property_id', propertyId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()
      : { data: null };

    if (!isOwner && !tenantLink) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const { data: tenants, error } = await serverSupabase
      .from('property_tenants')
      .select('id, name, email, phone, lease_start, lease_end, notes, is_active, invitation_sent_at, invitation_accepted_at, user_id, created_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
    }

    return NextResponse.json({ tenants: tenants || [] });
  },
);

/**
 * POST /api/properties/[id]/tenants
 * Add a tenant and optionally send an email invitation
 */
export const POST = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const body = await req.json();

    // Verify ownership
    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id, address, name')
      .eq('id', propertyId)
      .single();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const { name, email, phone, lease_start, lease_end, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Check if tenant with same email already exists for this property
    if (email) {
      const { data: existing } = await serverSupabase
        .from('property_tenants')
        .select('id')
        .eq('property_id', propertyId)
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'A tenant with this email already exists for this property' },
          { status: 409 }
        );
      }

      // Check if tenant already has a Mintenance account
      const { data: existingUser } = await serverSupabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      // If they have an account, link them directly
      if (existingUser) {
        const { data: tenant, error } = await serverSupabase
          .from('property_tenants')
          .insert({
            property_id: propertyId,
            name,
            email: email.toLowerCase().trim(),
            phone: phone || null,
            lease_start: lease_start || null,
            lease_end: lease_end || null,
            notes: notes || null,
            user_id: existingUser.id,
            invitation_accepted_at: new Date().toISOString(),
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          logger.error('Failed to create tenant', { error });
          return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
        }

        // Notify the existing user
        await serverSupabase.from('notifications').insert({
          user_id: existingUser.id,
          type: 'tenant_linked',
          title: 'Property Access Granted',
          message: `You've been added as a tenant at ${property.address || property.name || 'a property'}. You can now submit maintenance requests.`,
          data: { property_id: propertyId },
        });

        return NextResponse.json({ tenant, linked: true }, { status: 201 });
      }
    }

    // Create tenant record with invitation token
    const { data: tenant, error } = await serverSupabase
      .from('property_tenants')
      .insert({
        property_id: propertyId,
        name,
        email: email?.toLowerCase().trim() || null,
        phone: phone || null,
        lease_start: lease_start || null,
        lease_end: lease_end || null,
        notes: notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create tenant', { error });
      return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
    }

    // Send invitation email if email provided
    if (email && tenant.invitation_token) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.co.uk';
      const inviteUrl = `${baseUrl}/register?invite=${tenant.invitation_token}`;

      // Get landlord name
      const { data: landlord } = await serverSupabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const landlordName = landlord?.first_name && landlord?.last_name
        ? `${landlord.first_name} ${landlord.last_name}`
        : 'Your landlord';

      const propertyAddress = property.address || property.name || 'your property';

      EmailService.sendTenantInviteEmail(email.toLowerCase().trim(), {
        tenantName: name,
        propertyAddress,
        landlordName,
        inviteUrl,
      }).then((sent) => {
        if (sent) {
          // Update invitation_sent_at
          serverSupabase
            .from('property_tenants')
            .update({ invitation_sent_at: new Date().toISOString() })
            .eq('id', tenant.id)
            .then(() => {});
        }
      }).catch((err) => {
        logger.error('Failed to send tenant invitation email', { err, tenantId: tenant.id });
      });
    }

    return NextResponse.json(
      { tenant, invitation_sent: !!email },
      { status: 201 }
    );
  },
);

/**
 * DELETE /api/properties/[id]/tenants?tenantId=xxx
 * Remove a tenant from a property
 */
export const DELETE = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const { error } = await serverSupabase
      .from('property_tenants')
      .delete()
      .eq('id', tenantId)
      .eq('property_id', propertyId);

    if (error) {
      return NextResponse.json({ error: 'Failed to remove tenant' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  },
);
