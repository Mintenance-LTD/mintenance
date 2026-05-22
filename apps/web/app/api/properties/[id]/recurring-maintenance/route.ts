import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getEffectiveHomeownerTier } from '@/lib/subscription/early-access';
import { hasFeatureAccess } from '@/lib/feature-access-config';

/**
 * 2026-05-22 Sprint 4: tier gate. Recurring maintenance is a Landlord+
 * feature on the new pricing model. Free homeowners get a 402 with the
 * upgrade message. Admins bypass. Honours early-access (-> agency).
 */
async function requireLandlordTier(userId: string, role: string) {
  if (role === 'admin') return null;
  const tier = await getEffectiveHomeownerTier(userId);
  if (!hasFeatureAccess('HOMEOWNER_RECURRING_MAINTENANCE', 'homeowner', tier)) {
    return NextResponse.json(
      {
        error: 'Subscription required',
        message:
          'Recurring maintenance scheduling requires a Landlord or Agency subscription.',
        requiresSubscription: true,
        feature: 'HOMEOWNER_RECURRING_MAINTENANCE',
      },
      { status: 402 }
    );
  }
  return null;
}

// GET /api/properties/[id]/recurring-maintenance
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (_req, { user, params }) => {
    const propertyId = params.id;

    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const { data: schedules, error } = await serverSupabase
      .from('recurring_maintenance_schedules')
      .select('*')
      .eq('property_id', propertyId)
      .order('next_due_date', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch schedules' },
        { status: 500 }
      );
    }

    return NextResponse.json({ schedules: schedules || [] });
  }
);

// POST /api/properties/[id]/recurring-maintenance
export const POST = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const body = await req.json();

    const tierBlock = await requireLandlordTier(user.id, user.role);
    if (tierBlock) return tierBlock;

    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const { title, category, frequency, next_due_date } = body;

    if (!title || !frequency || !next_due_date) {
      return NextResponse.json(
        { error: 'title, frequency, and next_due_date are required' },
        { status: 400 }
      );
    }

    const validFrequencies = ['weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    const { data: schedule, error } = await serverSupabase
      .from('recurring_maintenance_schedules')
      .insert({
        property_id: propertyId,
        title,
        category: category || null,
        frequency,
        next_due_date,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ schedule }, { status: 201 });
  }
);

// DELETE /api/properties/[id]/recurring-maintenance
export const DELETE = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get('scheduleId');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'scheduleId is required' },
        { status: 400 }
      );
    }

    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const { error } = await serverSupabase
      .from('recurring_maintenance_schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('property_id', propertyId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }
);

// PATCH /api/properties/[id]/recurring-maintenance — toggle active
export const PATCH = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const body = await req.json();
    const { scheduleId, is_active } = body;

    if (!scheduleId || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'scheduleId and is_active required' },
        { status: 400 }
      );
    }

    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const { data: schedule, error } = await serverSupabase
      .from('recurring_maintenance_schedules')
      .update({ is_active })
      .eq('id', scheduleId)
      .eq('property_id', propertyId)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update schedule' },
        { status: 500 }
      );
    }

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ schedule });
  }
);
