import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { sanitizeEmail } from '@/lib/sanitizer';
import { validateRequest } from '@/lib/validation/validator';
import { gdprAnonymizeSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const validation = await validateRequest(request, gdprAnonymizeSchema);
    if ('headers' in validation) {
      return validation; // Return NextResponse error
    }

    const { email, confirmation } = validation.data;

    // Verify email matches user's email
    let sanitizedEmail: string;
    try {
      sanitizedEmail = sanitizeEmail(email);
    } catch (error) {
      logger.warn('Invalid email format in anonymize request', { 
        service: 'gdpr',
        userId: user.id,
        email: email.substring(0, 3) + '***'
      });
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (sanitizedEmail !== user.email) {
      logger.warn('Email mismatch in anonymize request', { 
        service: 'gdpr',
        userId: user.id,
        providedEmail: email.substring(0, 3) + '***'
      });
      return NextResponse.json({ error: 'Email does not match your account' }, { status: 400 });
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
      return NextResponse.json({ 
        error: 'You already have a pending data anonymization request' 
      }, { status: 400 });
    }

    // Create DSR request
    const { data: dsrRequest, error: dsrError } = await serverSupabase
      .from('dsr_requests')
      .insert({
        user_id: user.id,
        request_type: 'rectification',
        status: 'pending',
        requested_by: user.id,
        notes: 'User requested data anonymization'
      })
      .select()
      .single();

    if (dsrError) {
      logger.error('Error creating DSR request', dsrError, {
        service: 'gdpr',
        userId: user.id,
        requestType: 'rectification'
      });
      return NextResponse.json({ 
        error: 'Failed to create data anonymization request' 
      }, { status: 500 });
    }

    // Execute data anonymization
    const { error: anonymizeError } = await serverSupabase
      .rpc('anonymize_user_data', { p_user_id: user.id });

    if (anonymizeError) {
      logger.error('Error anonymizing user data', anonymizeError, {
        service: 'gdpr',
        userId: user.id,
        requestId: dsrRequest.id
      });
      
      // Update DSR request status to failed
      await serverSupabase
        .from('dsr_requests')
        .update({ 
          status: 'rejected',
          notes: 'Anonymization failed: ' + anonymizeError.message
        })
        .eq('id', dsrRequest.id);

      return NextResponse.json({ 
        error: 'Failed to anonymize user data' 
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

    logger.info('Data anonymization completed successfully', {
      service: 'gdpr',
      userId: user.id,
      requestId: dsrRequest.id
    });

    return NextResponse.json({
      message: 'Your data has been successfully anonymized',
      request_id: dsrRequest.id
    });

  } catch (error) {
    logger.error('GDPR anonymization error', error, { service: 'gdpr' });
    return NextResponse.json(
      { error: 'Failed to anonymize user data' },
      { status: 500 }
    );
  }
}
