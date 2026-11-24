import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { getPropertyForManagement } from '@/lib/services/property-team/property-management-access';
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getEffectiveHomeownerTier } from '@/lib/subscription/early-access';
import { hasFeatureAccess } from '@/lib/feature-access-config';

const emergencyPhone = z
  .string()
  .trim()
  .max(40)
  .transform((value) => value.replace(/[ ().-]/g, '') || null)
  .pipe(
    z
      .string()
      .regex(/^\+?[0-9]{7,15}$/)
      .nullable()
  )
  .nullable();

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

    const property = await getPropertyForManagement(
      user,
      propertyId,
      'manage_contacts'
    );

    const [links, contact, fallback] = await Promise.all([
      serverSupabase
        .from('anonymous_report_tokens')
        .select('id, token, property_id, label, is_active, created_at')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false }),
      serverSupabase
        .from('properties')
        .select('tenant_emergency_phone')
        .eq('id', propertyId)
        .single(),
      serverSupabase.rpc('emergency_report_fallback', {
        p_property: propertyId,
        p_owner: property.owner_id,
        p_current: property.owner_id,
      }),
    ]);

    if (links.error || contact.error) {
      return NextResponse.json(
        { error: 'Failed to fetch tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        tokens: links.data ?? [],
        emergency_phone: contact.data?.tenant_emergency_phone ?? null,
        has_emergency_fallback: fallback.error ? null : !!fallback.data,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
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
      z.union([
        z
          .object({ token_id: z.string().uuid(), is_active: z.boolean() })
          .strict(),
        z.object({ emergency_phone: emergencyPhone }).strict(),
      ])
    );
    if ('headers' in validation) return validation;
    const property = await getPropertyForManagement(
      user,
      propertyId,
      'manage_contacts'
    );
    if ('emergency_phone' in validation.data) {
      const { data, error } = await serverSupabase
        .from('properties')
        .update({ tenant_emergency_phone: validation.data.emergency_phone })
        .eq('id', propertyId)
        .eq('owner_id', property.owner_id)
        .select('tenant_emergency_phone')
        .single();
      if (error || !data)
        return NextResponse.json(
          { error: 'Emergency contact could not be saved' },
          { status: 500 }
        );
      return NextResponse.json({
        emergency_phone: data.tenant_emergency_phone,
      });
    }
    const { token_id, is_active } = validation.data;
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
