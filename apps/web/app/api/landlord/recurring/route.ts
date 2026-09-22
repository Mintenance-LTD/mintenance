import { portfolioScheduleInput } from '@/lib/services/recurring/schedule-input';
import { validateRequest } from '@/lib/validation/validator';
import { getPropertyForManagement } from '@/lib/services/property-team/property-management-access';
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getEffectiveHomeownerTier } from '@/lib/subscription/early-access';
import { hasFeatureAccess } from '@/lib/feature-access-config';

/**
 * 2026-05-24 audit-31 P2: tier gate. Recurring maintenance is a
 * Landlord+ feature, enforced on the property-scoped mobile route
 * (/api/properties/[id]/recurring-maintenance) since 2026-05-22, but
 * this dashboard route did not gate at all — homeowners on the free
 * tier could still insert schedules through the landlord dashboard
 * surface. Mirror the same requireLandlordTier helper so both
 * surfaces enforce the same paid-feature boundary.
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

// GET /api/landlord/recurring - List recurring schedules
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (_req, { user }) => {
    const { data, error } = await serverSupabase
      .from('recurring_schedules')
      .select('*')
      .eq('owner_id', user.id)
      .order('next_due_date', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch schedules' },
        { status: 500 }
      );
    }

    return NextResponse.json({ schedules: data || [] });
  }
);

// POST /api/landlord/recurring - Create a new recurring schedule
export const POST = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user }) => {
    const validation = await validateRequest(req, portfolioScheduleInput);
    if ('headers' in validation) return validation;
    const {
      property_id,
      task_type,
      title,
      description,
      frequency,
      next_due_date,
      auto_create_job,
    } = validation.data;
    const property = await getPropertyForManagement(
      user,
      property_id,
      'manage_maintenance'
    );
    const tierBlock = await requireLandlordTier(property.owner_id, user.role);
    if (tierBlock) return tierBlock;

    const { data: schedule, error } = await serverSupabase
      .from('recurring_schedules')
      .insert({
        property_id,
        owner_id: property.owner_id,
        task_type: task_type || 'general',
        title: title.trim(),
        description: description?.trim() || null,
        category: 'general',
        frequency,
        next_due_date,
        auto_create_job: auto_create_job ?? false,
        is_active: true,
      })
      .select()
      .single();

    if (error || !schedule?.id) {
      return NextResponse.json(
        { error: 'Failed to create schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ schedule }, { status: 201 });
  }
);
