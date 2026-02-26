import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { sanitizeEmail } from '@/lib/sanitizer';
import { validateRequest } from '@/lib/validation/validator';
import { gdprDeleteSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 5 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, gdprDeleteSchema);
    if ('headers' in validation) return validation;

    const { email } = validation.data;

    let sanitizedEmail: string;
    try {
      sanitizedEmail = sanitizeEmail(email);
    } catch {
      logger.warn('Invalid email format in delete request', { service: 'gdpr', userId: user.id, email: email.substring(0, 3) + '***' });
      throw new BadRequestError('Invalid email format');
    }

    if (sanitizedEmail !== user.email) {
      logger.warn('Email mismatch in delete request', { service: 'gdpr', userId: user.id, providedEmail: email.substring(0, 3) + '***' });
      throw new BadRequestError('Email does not match your account');
    }

    // Check if user already has a pending deletion request
    const { data: existingRequest } = await serverSupabase
      .from('dsr_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('request_type', 'erasure')
      .in('status', ['pending', 'in_progress'])
      .single();

    if (existingRequest) throw new BadRequestError('You already have a pending data deletion request');

    const { data: dsrRequest, error: dsrError } = await serverSupabase
      .from('dsr_requests')
      .insert({ user_id: user.id, request_type: 'erasure', status: 'pending', requested_by: user.id, notes: 'User requested complete data deletion' })
      .select()
      .single();

    if (dsrError) {
      logger.error('Error creating DSR request', dsrError, { service: 'gdpr', userId: user.id, requestType: 'erasure' });
      throw new InternalServerError('Failed to create data deletion request');
    }

    const { error: deleteError } = await serverSupabase.rpc('delete_user_data', { p_user_id: user.id });

    if (deleteError) {
      logger.error('Error deleting user data', deleteError, { service: 'gdpr', userId: user.id, requestId: dsrRequest.id });
      await serverSupabase.from('dsr_requests').update({ status: 'rejected', notes: 'Deletion failed: ' + deleteError.message }).eq('id', dsrRequest.id);
      throw new InternalServerError('Failed to delete user data');
    }

    await serverSupabase.from('dsr_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', dsrRequest.id);

    logger.info('Data deletion completed successfully', { service: 'gdpr', userId: user.id, requestId: dsrRequest.id });

    // Clear authentication cookies after successful account deletion
    const response = NextResponse.json({ message: 'Your data has been successfully deleted', request_id: dsrRequest.id });
    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');
    return response;
  }
);
