import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { sanitizeEmail } from '@/lib/sanitizer';
import { validateRequest } from '@/lib/validation/validator';
import { gdprAnonymizeSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, gdprAnonymizeSchema);
    if ('headers' in validation) return validation;

    const { email } = validation.data;

    let sanitizedEmail: string;
    try {
      sanitizedEmail = sanitizeEmail(email);
    } catch {
      logger.warn('Invalid email format in anonymize request', { service: 'gdpr', userId: user.id, email: email.substring(0, 3) + '***' });
      throw new BadRequestError('Invalid email format');
    }

    if (sanitizedEmail !== user.email) {
      logger.warn('Email mismatch in anonymize request', { service: 'gdpr', userId: user.id, providedEmail: email.substring(0, 3) + '***' });
      throw new BadRequestError('Email does not match your account');
    }

    // Check if user already has a pending anonymization request
    const { data: existingRequest } = await serverSupabase
      .from('dsr_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('request_type', 'rectification')
      .in('status', ['pending', 'in_progress'])
      .single();

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending data anonymization request' }, { status: 400 });
    }

    const { data: dsrRequest, error: dsrError } = await serverSupabase
      .from('dsr_requests')
      .insert({ user_id: user.id, request_type: 'rectification', status: 'pending', requested_by: user.id, notes: 'User requested data anonymization' })
      .select()
      .single();

    if (dsrError) {
      logger.error('Error creating DSR request', dsrError, { service: 'gdpr', userId: user.id, requestType: 'rectification' });
      return NextResponse.json({ error: 'Failed to create data anonymization request' }, { status: 500 });
    }

    const { error: anonymizeError } = await serverSupabase.rpc('anonymize_user_data', { p_user_id: user.id });

    if (anonymizeError) {
      logger.error('Error anonymizing user data', anonymizeError, { service: 'gdpr', userId: user.id, requestId: dsrRequest.id });
      await serverSupabase.from('dsr_requests').update({ status: 'rejected', notes: 'Anonymization failed: ' + anonymizeError.message }).eq('id', dsrRequest.id);
      return NextResponse.json({ error: 'Failed to anonymize user data' }, { status: 500 });
    }

    await serverSupabase.from('dsr_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', dsrRequest.id);

    logger.info('Data anonymization completed successfully', { service: 'gdpr', userId: user.id, requestId: dsrRequest.id });

    return NextResponse.json({ message: 'Your data has been successfully anonymized', request_id: dsrRequest.id });
  }
);
