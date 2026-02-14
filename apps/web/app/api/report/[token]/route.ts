import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

const VALID_CATEGORIES = [
  'plumbing', 'electrical', 'heating', 'structural', 'damp_mould',
  'pest_control', 'appliance', 'door_window', 'roof_guttering',
  'garden_exterior', 'fire_safety', 'general',
] as const;

// POST /api/report/[token] - Submit anonymous maintenance report (public, no auth)
export const POST = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 5, windowMs: 60_000 }, csrf: false },
  async (req, { params }) => {
    const tokenValue = params.token;

    // Validate token exists and is active
    const { data: tokenRecord, error: tokenError } = await serverSupabase
      .from('anonymous_report_tokens')
      .select('id, property_id, is_active, owner_id')
      .eq('token', tokenValue)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json({ error: 'Invalid reporting link' }, { status: 404 });
    }

    if (!tokenRecord.is_active) {
      return NextResponse.json({ error: 'This reporting link has been deactivated' }, { status: 410 });
    }

    const body = await req.json();
    const { reporter_name, reporter_phone, reporter_email, reporter_unit, category, description, urgency, photos } = body;

    // Validate required fields
    if (!reporter_name || typeof reporter_name !== 'string' || reporter_name.trim().length < 2) {
      return NextResponse.json({ error: 'A valid name is required' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return NextResponse.json({ error: 'Please provide a description (at least 10 characters)' }, { status: 400 });
    }

    const safeCategory = VALID_CATEGORIES.includes(category) ? category : 'general';
    const safeUrgency = ['low', 'medium', 'high', 'urgent'].includes(urgency) ? urgency : 'medium';

    // Create the anonymous report
    const { data: report, error: insertError } = await serverSupabase
      .from('anonymous_reports')
      .insert({
        token_id: tokenRecord.id,
        property_id: tokenRecord.property_id,
        reporter_name: reporter_name.trim(),
        reporter_phone: reporter_phone?.trim() || null,
        reporter_email: reporter_email?.trim() || null,
        reporter_unit: reporter_unit?.trim() || null,
        category: safeCategory,
        description: description.trim(),
        urgency: safeUrgency,
        photos: Array.isArray(photos) ? photos.slice(0, 5) : null,
        status: 'new',
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    // Increment total_reports counter on token (non-critical)
    await Promise.resolve(
      serverSupabase
        .from('anonymous_report_tokens')
        .update({ last_report_at: new Date().toISOString() })
        .eq('id', tokenRecord.id),
    ).catch(() => { /* non-critical */ });

    // Create notification for the property owner (non-critical)
    await Promise.resolve(
      serverSupabase
        .from('notifications')
        .insert({
          user_id: tokenRecord.owner_id,
          type: 'tenant_report',
          title: 'New Tenant Report',
          message: `A maintenance issue has been reported at your property: ${safeCategory.replace(/_/g, ' ')}`,
          data: { report_id: report.id, category: safeCategory, urgency: safeUrgency },
        }),
    ).catch(() => { /* non-critical */ });

    return NextResponse.json({
      success: true,
      report_id: report.id,
      message: 'Your report has been submitted. The property manager will be notified.',
    }, { status: 201 });
  },
);

// GET /api/report/[token] - Validate a token (public, no auth)
export const GET = withApiHandler(
  { auth: false, csrf: false, rateLimit: { maxRequests: 30, windowMs: 60_000 } },
  async (_req, { params }) => {
    const tokenValue = params.token;

    const { data: tokenRecord, error } = await serverSupabase
      .from('anonymous_report_tokens')
      .select(`
        id, is_active, label,
        properties:property_id (id, property_name, address)
      `)
      .eq('token', tokenValue)
      .single();

    if (error || !tokenRecord) {
      return NextResponse.json({ error: 'Invalid reporting link' }, { status: 404 });
    }

    if (!tokenRecord.is_active) {
      return NextResponse.json({ error: 'This reporting link has been deactivated' }, { status: 410 });
    }

    return NextResponse.json({
      valid: true,
      property: tokenRecord.properties,
      label: tokenRecord.label,
    });
  },
);
