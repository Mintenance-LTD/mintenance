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

/**
 * 2026-05-23 audit-20 P1: previously this route read/wrote
 * `recurring_maintenance_schedules`, but the cron job creator only polls
 * `recurring_schedules WHERE auto_create_job = true`. Mobile schedules
 * persisted, toggled, and deleted fine but never auto-created jobs —
 * homeowners thought their boiler / EICR / gutter reminders were
 * fully wired when nothing was firing.
 *
 * This route is now the canonical mobile / property recurring write
 * path and uses `recurring_schedules` with auto_create_job=true by
 * default. /api/landlord/recurring continues to use the same table for
 * the dashboard list view, so the two surfaces stay consistent.
 *
 * 2026-05-24 audit-31 P1: the live recurring_schedules_frequency_check
 * CHECK constraint allows only {monthly, quarterly, biannual, annual}
 * (verified via pg_constraint). The previous accept-list included
 * 'weekly' and 'yearly' from a stale comment that claimed advanceDate
 * handled them — the DB still 23514s before advanceDate is reached.
 * The accept list now mirrors the constraint exactly. 'yearly' is
 * still coerced to 'annual' on input so any older client cache
 * doesn't break (same end-state, just the canonical column value).
 */
const VALID_FREQUENCIES = ['monthly', 'quarterly', 'biannual', 'annual'];

function normalizeFrequency(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  if (v === 'yearly') return 'annual';
  return VALID_FREQUENCIES.includes(v) ? v : null;
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
      .from('recurring_schedules')
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

    const normalizedFrequency = normalizeFrequency(frequency);
    if (!normalizedFrequency) {
      return NextResponse.json(
        {
          error: `Invalid frequency. Allowed: ${VALID_FREQUENCIES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const { data: schedule, error } = await serverSupabase
      .from('recurring_schedules')
      .insert({
        property_id: propertyId,
        // 2026-05-23 audit-20 P1: recurring_schedules.owner_id is the FK
        // RecurringJobCreatorService uses when constructing the new job
        // (homeowner_id = owner_id). For an admin acting on behalf of a
        // homeowner, fall back to the property owner so auto-created
        // jobs still attach to the right person.
        owner_id: user.role === 'admin' ? property.owner_id : user.id,
        title,
        description: title,
        task_type: 'general',
        category: category || 'general',
        frequency: normalizedFrequency,
        next_due_date,
        // Mobile / property flow assumes auto-creation: the whole UI
        // promises "next visit on …" and the homeowner expects the job
        // to show up. The /api/landlord/recurring dashboard surface lets
        // the user opt in/out explicitly; here we default true.
        auto_create_job: true,
        is_active: true,
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
      .from('recurring_schedules')
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
      .from('recurring_schedules')
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
