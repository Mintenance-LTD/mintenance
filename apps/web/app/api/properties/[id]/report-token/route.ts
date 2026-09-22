import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { getPropertyForManagement } from '@/lib/services/property-team/property-management-access';
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getEffectiveHomeownerTier } from '@/lib/subscription/early-access';
import { hasFeatureAccess } from '@/lib/feature-access-config';

/**
 * 2026-05-22 Sprint 4: tier gate. Tenant reporting links are a Landlord+
 * feature. Free homeowners get a 402 on link creation. Admins bypass.
 * GETs stay open (so an existing token reader can still load history).
 */
async function requireLandlordTier(userId: string, role: string) {
  if (role === 'admin') return null;
  const tier = await getEffectiveHomeownerTier(userId);
  if (!hasFeatureAccess('HOMEOWNER_TENANT_REPORTING', 'homeowner', tier)) {
    return NextResponse.json(
      {
        error: 'Subscription required',
        message:
          'Tenant reporting links require a Landlord or Agency subscription.',
        requiresSubscription: true,
        feature: 'HOMEOWNER_TENANT_REPORTING',
      },
      { status: 402 }
    );
  }
  return null;
}

// GET /api/properties/[id]/report-token - Get or list report tokens for a property
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (_req, { user, params }) => {
    const propertyId = params.id;

    await getPropertyForManagement(user, propertyId, 'manage_contacts');

    const { data: tokens, error } = await serverSupabase
      .from('anonymous_report_tokens')
      .select('id, property_id, label, is_active, created_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tokens: tokens || [] });
  }
);

// POST /api/properties/[id]/report-token - Create a new report token
export const POST = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const validation = await validateRequest(
      req,
      z.object({
        label: z.string().trim().min(1).max(200).nullable().optional(),
      })
    );
    if ('headers' in validation) return validation;
    const body = validation.data;

    const property = await getPropertyForManagement(
      user,
      propertyId,
      'manage_contacts'
    );
    const tierBlock = await requireLandlordTier(property.owner_id, user.role);
    if (tierBlock) return tierBlock;

    const { data: token, error } = await serverSupabase
      .from('anonymous_report_tokens')
      .insert({
        property_id: propertyId,
        owner_id: property.owner_id,
        label: body.label || null,
        is_active: true,
      })
      .select()
      .single();

    if (error || !token) {
      return NextResponse.json(
        { error: 'Failed to create token' },
        { status: 500 }
      );
    }

    return NextResponse.json({ token }, { status: 201 });
  }
);

// PATCH /api/properties/[id]/report-token - Toggle token active/inactive
export const PATCH = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const validation = await validateRequest(
      req,
      z.object({ token_id: z.string().uuid(), is_active: z.boolean() })
    );
    if ('headers' in validation) return validation;
    const { token_id, is_active } = validation.data;
    const property = await getPropertyForManagement(
      user,
      propertyId,
      'manage_contacts'
    );
    // Disabling remains available after downgrade so live links can be revoked.
    if (is_active) {
      const tierBlock = await requireLandlordTier(property.owner_id, user.role);
      if (tierBlock) return tierBlock;
    }

    const { data: token, error } = await serverSupabase
      .from('anonymous_report_tokens')
      .update({ is_active })
      .eq('id', token_id)
      .eq('property_id', propertyId)
      .select()
      .single();

    if (error || !token) {
      return NextResponse.json(
        { error: 'Failed to update token' },
        { status: 500 }
      );
    }

    return NextResponse.json({ token });
  }
);
