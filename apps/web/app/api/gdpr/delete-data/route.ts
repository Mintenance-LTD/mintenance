import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { sanitizeEmail } from '@/lib/sanitizer';
import { validateRequest } from '@/lib/validation/validator';
import { gdprDeleteSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import { checkApiRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitResult = await checkApiRateLimit(`gdpr-delete:${ip}`);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const validation = await validateRequest(request, gdprDeleteSchema);
    if ('headers' in validation) {
      return validation; // Return NextResponse error
    }

    const { email, confirmation } = validation.data;

    // Verify email matches user's email
    let sanitizedEmail: string;
    try {
      sanitizedEmail = sanitizeEmail(email);
    } catch (error) {
      logger.warn('Invalid email format in delete request', { 
        service: 'gdpr',
        userId: user.id,
        email: email.substring(0, 3) + '***'
      });
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (sanitizedEmail !== user.email) {
      logger.warn('Email mismatch in delete request', { 
        service: 'gdpr',
        userId: user.id,
        providedEmail: email.substring(0, 3) + '***'
      });
      return NextResponse.json({ error: 'Email does not match your account' }, { status: 400 });
    }

    // Check if user already has a pending deletion request
    const { data: existingRequest } = await serverSupabase
      .from('dsr_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('request_type', 'erasure')
      .in('status', ['pending', 'in_progress'])
      .single();

    if (existingRequest) {
      return NextResponse.json({ 
        error: 'You already have a pending data deletion request' 
      }, { status: 400 });
    }

    // Create DSR request
    const { data: dsrRequest, error: dsrError } = await serverSupabase
      .from('dsr_requests')
      .insert({
        user_id: user.id,
        request_type: 'erasure',
        status: 'pending',
        requested_by: user.id,
        notes: 'User requested complete data deletion'
      })
      .select()
      .single();

    if (dsrError) {
      logger.error('Error creating DSR request', dsrError, {
        service: 'gdpr',
        userId: user.id,
        requestType: 'erasure'
      });
      return NextResponse.json({ 
        error: 'Failed to create data deletion request' 
      }, { status: 500 });
    }

    // Execute data deletion
    const { error: deleteError } = await serverSupabase
      .rpc('delete_user_data', { p_user_id: user.id });

    if (deleteError) {
      logger.error('Error deleting user data', deleteError, {
        service: 'gdpr',
        userId: user.id,
        requestId: dsrRequest.id
      });
      
      // Update DSR request status to failed
      await serverSupabase
        .from('dsr_requests')
        .update({ 
          status: 'rejected',
          notes: 'Deletion failed: ' + deleteError.message
        })
        .eq('id', dsrRequest.id);

      return NextResponse.json({ 
        error: 'Failed to delete user data' 
      }, { status: 500 });
    }

    // Update DSR request status
    await serverSupabase
      .from('dsr_requests')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', dsrRequest.id);

    // Clear authentication cookies
    const response = NextResponse.json({
      message: 'Your data has been successfully deleted',
      request_id: dsrRequest.id
    });

    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');

    logger.info('Data deletion completed successfully', {
      service: 'gdpr',
      userId: user.id,
      requestId: dsrRequest.id
    });

    return response;

  } catch (error) {
    logger.error('GDPR deletion error', error, { service: 'gdpr' });
    return NextResponse.json(
      { error: 'Failed to delete user data' },
      { status: 500 }
    );
  }
}
