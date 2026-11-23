import { NextResponse } from 'next/server';
import { randomBytes, createHash, createHmac } from 'node:crypto';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { logger } from '@mintenance/shared';

const VALID_CATEGORIES = [
  'plumbing',
  'electrical',
  'heating',
  'structural',
  'damp_mould',
  'pest_control',
  'appliance',
  'door_window',
  'roof_guttering',
  'garden_exterior',
  'fire_safety',
  'general',
] as const;

const reportSchema = z.object({
  reporter_name: z.string().trim().min(2).max(200),
  reporter_phone: z.string().trim().max(50).optional().nullable(),
  reporter_email: z.string().trim().email().max(254).optional().nullable(),
  reporter_unit: z.string().trim().max(120).optional().nullable(),
  category: z.string().max(40).optional(),
  description: z.string().trim().min(10).max(5000),
  urgency: z.string().max(20).optional(),
  // Keep photo references bounded and textual. The reporting form receives
  // storage URLs, while the token endpoint must not accept arbitrarily large
  // arrays or strings that can amplify database/storage work.
  photos: z.array(z.string().max(2048)).max(5).optional().nullable(),
});

const recoverySchema = z.object({ recover: z.literal(true) }).strict();
const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

function normalizeReport(input: z.infer<typeof reportSchema>) {
  const category =
    VALID_CATEGORIES.find((item) => item === input.category) ?? 'general';
  // Older clients sent "urgent" for emergencies.
  const urgency =
    input.urgency === 'urgent' || input.urgency === 'emergency'
      ? 'emergency'
      : input.urgency === 'high' || input.urgency === 'low'
        ? input.urgency
        : 'medium';
  return {
    reporter_name: input.reporter_name,
    reporter_phone: input.reporter_phone || null,
    reporter_email: input.reporter_email || null,
    reporter_unit: input.reporter_unit || null,
    category,
    description: input.description,
    urgency,
    photos: input.photos ?? null,
  };
}

const intakeHeaders = { 'Cache-Control': 'no-store' };
const intakeErrors: Record<
  string,
  { status: number; error: string; code: string }
> = {
  PT404: {
    status: 404,
    error: 'Invalid reporting link',
    code: 'LINK_UNAVAILABLE',
  },
  PT410: {
    status: 410,
    error: 'This reporting link or recovery attempt is no longer available.',
    code: 'LINK_UNAVAILABLE',
  },
  P0002: {
    status: 404,
    error: 'No report was found for this attempt yet.',
    code: 'REPORT_NOT_FOUND',
  },
  PT409: {
    status: 409,
    error:
      'A report was already saved with different details. Recover its private link to send an update.',
    code: 'DETAILS_CHANGED',
  },
};

// public: tenants use their reporting link without an account. Recovery also requires the submission key.
export const POST = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 5, windowMs: 60_000 }, csrf: false },
  async (req, { params }) => {
    const token = params.token;
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400, headers: intakeHeaders }
      );
    }

    const suppliedKey = req.headers.get('x-report-submission-key');
    const recovery = recoverySchema.safeParse(rawBody).success;
    const parsed = reportSchema.safeParse(rawBody);
    if (
      (suppliedKey !== null && !/^[0-9a-f]{64}$/.test(suppliedKey)) ||
      (recovery && !suppliedKey) ||
      (!recovery && !parsed.success)
    ) {
      return NextResponse.json(
        { error: 'Invalid report data' },
        { status: 400, headers: intakeHeaders }
      );
    }

    const key = suppliedKey ?? randomBytes(32).toString('hex');
    // Separate the stored lookup hash from the receipt. The raw retry key
    // never enters the database, notifications or the page URL.
    const receipt = createHmac('sha256', key)
      .update('mintenance-report-receipt-v1:' + token)
      .digest('hex');
    const report = parsed.success ? normalizeReport(parsed.data) : null;
    const { data, error } = await serverSupabase.rpc(
      'submit_tenant_report_once',
      {
        p_token: token,
        p_key_hash: sha256('mintenance-report-submission-v1:' + key),
        p_receipt_hash: sha256(receipt),
        p_payload_hash: report
          ? createHmac('sha256', key)
              .update('mintenance-report-payload-v1:' + JSON.stringify(report))
              .digest('hex')
          : null,
        p_report: report,
      }
    );

    if (error || !data?.id || typeof data.created !== 'boolean') {
      const result = intakeErrors[error?.code ?? ''];
      return NextResponse.json(
        result
          ? { error: result.error, code: result.code }
          : { error: 'Failed to confirm report' },
        { status: result?.status ?? 500, headers: intakeHeaders }
      );
    }

    // Emergency ownership and its first alert already committed with the report.
    // Ordinary preferences still apply, and replay never sends an extra alert.
    if (data.created && report && report.urgency !== 'emergency') {
      await NotificationService.createNotification({
        userId: data.owner_id,
        type: 'tenant_report',
        title: `Tenant flagged ${report.category.replace(/_/g, ' ')} at your property`,
        message:
          report.urgency === 'high'
            ? 'Urgent — tap to review and post a job.'
            : 'Tap to review and post a job.',
        actionUrl: `/landlord/reports?reportId=${data.id}`,
        metadata: {
          report_id: data.id,
          category: report.category,
          urgency: report.urgency,
        },
      }).catch(() => {
        logger.warn('Tenant-report notification failed', {
          service: 'report-token',
          reportId: data.id,
        });
      });
    }

    const awaitingAcknowledgment =
      data.urgency === 'emergency' && data.status === 'new';
    return NextResponse.json(
      {
        success: true,
        conversation_url: `/maintenance/reports/${data.id}#${receipt}`,
        report_id: data.id,
        urgency: data.urgency,
        ...(awaitingAcknowledgment ? { acknowledgment: 'pending' } : {}),
        message: awaitingAcknowledgment
          ? 'Your report has been saved and is awaiting human acknowledgment. Do not wait for a reply in an emergency.'
          : 'Your report has been submitted for the property manager to review.',
      },
      { status: data.created ? 201 : 200, headers: intakeHeaders }
    );
  }
);

// GET /api/report/[token] - Validate a token (public, no auth)
export const GET = withApiHandler(
  {
    auth: false,
    csrf: false,
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  },
  async (_req, { params }) => {
    const tokenValue = params.token;

    const { data: tokenRecord, error } = await serverSupabase
      .from('anonymous_report_tokens')
      .select(
        `
        id, is_active, label,
        properties:property_id (id, property_name, address, tenant_emergency_phone)
      `
      )
      .eq('token', tokenValue)
      .single();

    if (error || !tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid reporting link' },
        { status: 404 }
      );
    }

    if (!tokenRecord.is_active) {
      return NextResponse.json(
        { error: 'This reporting link has been deactivated' },
        { status: 410 }
      );
    }

    // 2026-07-26: a token can now outlive its property (property_id is
    // ON DELETE SET NULL — migration 20260726115252, which stops a property
    // delete cascade-wiping the tenant reports hanging off the token). With
    // no property there is nothing to report against, so the public form
    // must not render.
    const linkedProperty = Array.isArray(tokenRecord.properties)
      ? tokenRecord.properties[0]
      : tokenRecord.properties;

    if (!linkedProperty) {
      return NextResponse.json(
        { error: 'This reporting link has been deactivated' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valid: true,
      property: {
        id: linkedProperty.id,
        property_name: linkedProperty.property_name,
        address: linkedProperty.address,
      },
      emergency_phone: linkedProperty.tenant_emergency_phone ?? null,
      label: tokenRecord.label,
    });
  }
);
