import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  hashSecret,
  requireReceipt,
  sendAccessEmail,
} from '@/lib/reports/followup';

const schema = z.object({
  action: z.enum(['request', 'recover', 'verify', 'disable']),
  reportId: z.string().uuid(),
  email: z.string().email().max(254).optional(),
  token: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});
const generic = {
  message:
    'If these details match an eligible report, a verification email will arrive shortly. Check your spam folder too.',
};
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
export const POST = withApiHandler(
  {
    // auth-check: ok — guest reports use receipt tokens; recovery emails only the stored address, and verify requires its one-time token.
    auth: false,
    csrf: false,
    rateLimit: { maxRequests: 5, windowMs: 60_000, criticality: 'auth' },
  },
  async (request) => {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      return reply({ error: 'Check your report reference and email.' }, 400);
    const { action, reportId, token, email } = parsed.data;
    if (action === 'verify') {
      if (!token)
        return reply({ error: 'Verification link unavailable.' }, 400);
      const receipt = randomBytes(32).toString('hex');
      const { data, error } = await serverSupabase.rpc('verify_report_email', {
        p_report: reportId,
        p_token: hashSecret(token),
        p_receipt: hashSecret(receipt),
      });
      if (error) throw error;
      return data
        ? reply({
            conversation_url: `/maintenance/reports/${reportId}#${receipt}`,
          })
        : reply(
            {
              error:
                'This link expired or was already used. Request another email.',
            },
            410
          );
    }
    let destination: string | null = null;
    if (action !== 'recover') {
      const report = await requireReceipt(
        reportId,
        request.headers.get('x-report-receipt')
      );
      destination = report.reporter_email;
      if (action === 'disable') {
        const { error } = await serverSupabase
          .from('report_email_access')
          .update({ enabled: false, token_hash: null, expires_at: null })
          .eq('report_id', reportId);
        if (error) throw error;
        return reply({ message: 'Email reply notifications turned off.' });
      }
      if (!destination)
        return reply(
          {
            error:
              'No email was supplied with this report. Keep your private link.',
          },
          400
        );
    }
    const { data: existing, error: readError } = await serverSupabase
      .from('report_email_access')
      .select('email,verified_at,requested_at')
      .eq('report_id', reportId)
      .maybeSingle();
    if (readError) throw readError;
    if (action === 'recover') {
      // Recovery cannot establish ownership from a newly supplied address.
      if (
        !existing ||
        !email ||
        existing.email.toLowerCase() !== email.trim().toLowerCase()
      )
        return reply(generic);
      destination = existing.email;
    }
    if (existing && Date.now() - Date.parse(existing.requested_at) < 60_000)
      return reply(
        action === 'recover'
          ? generic
          : { error: 'Please wait a minute before requesting another email.' },
        action === 'recover' ? 200 : 429
      );
    const secret = randomBytes(32).toString('hex');
    const { data: issued, error } = await serverSupabase.rpc(
      'issue_report_email',
      { p_report: reportId, p_email: destination!, p_hash: hashSecret(secret) }
    );
    if (error) throw error;
    if (!issued)
      return reply(
        action === 'recover'
          ? generic
          : { error: 'Please wait a minute before requesting another email.' },
        action === 'recover' ? 200 : 429
      );
    const sent = await sendAccessEmail(destination!, reportId, secret);
    return reply(
      action === 'recover'
        ? generic
        : {
            email_sent: sent,
            message: sent
              ? 'Check your inbox to confirm your email. The link expires in 30 minutes.'
              : 'Email could not be sent. Keep your private link and try again later.',
          }
    );
  }
);
