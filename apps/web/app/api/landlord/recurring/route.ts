import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

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
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
    }

    return NextResponse.json({ schedules: data || [] });
  },
);

// POST /api/landlord/recurring - Create a new recurring schedule
export const POST = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user }) => {
    const body = await req.json();
    const { property_id, task_type, title, description, frequency, next_due_date, auto_create_job } = body;

    if (!property_id || !title?.trim() || !next_due_date) {
      return NextResponse.json({ error: 'property_id, title, and next_due_date are required' }, { status: 400 });
    }

    // Verify property ownership
    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', property_id)
      .single();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Property not found or forbidden' }, { status: 404 });
    }

    const validFrequencies = ['monthly', 'quarterly', 'biannual', 'annual'];
    const safeFrequency = validFrequencies.includes(frequency) ? frequency : 'annual';

    const { data: schedule, error } = await serverSupabase
      .from('recurring_schedules')
      .insert({
        property_id,
        owner_id: user.id,
        task_type: task_type || 'general',
        title: title.trim(),
        description: description?.trim() || null,
        category: 'general',
        frequency: safeFrequency,
        next_due_date,
        auto_create_job: auto_create_job || false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
    }

    return NextResponse.json({ schedule }, { status: 201 });
  },
);
