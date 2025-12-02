import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { sanitizeEmail } from '@/lib/sanitizer';
import { validateRequest } from '@/lib/validation/validator';
import { gdprEmailSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

// Type definitions for GDPR export
interface ExportDataRow {
  table_name: string;
  data: Record<string, unknown>;
}

interface FormattedExportData {
  user_id: string;
  export_date: string;
  data: Record<string, Record<string, unknown>[]>;
}

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
// Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const validation = await validateRequest(request, gdprEmailSchema);
    if ('headers' in validation) {
      return validation; // Return NextResponse error
    }

    const { email } = validation.data;

    // Verify email matches user's email
    let sanitizedEmail: string;
    try {
      sanitizedEmail = sanitizeEmail(email);
    } catch (error) {
      logger.warn('Invalid email format in export request', { 
        service: 'gdpr',
        userId: user.id,
        email: email.substring(0, 3) + '***'
      });
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (sanitizedEmail !== user.email) {
      logger.warn('Email mismatch in export request', { 
        service: 'gdpr',
        userId: user.id,
        providedEmail: email.substring(0, 3) + '***'
      });
      return NextResponse.json({ error: 'Email does not match your account' }, { status: 400 });
    }

    // Check if user already has a pending export request
    const { data: existingRequest } = await serverSupabase
      .from('dsr_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('request_type', 'portability')
      .in('status', ['pending', 'in_progress'])
      .single();

    if (existingRequest) {
      return NextResponse.json({ 
        error: 'You already have a pending data export request' 
      }, { status: 400 });
    }

    // Create DSR request
    const { data: dsrRequest, error: dsrError } = await serverSupabase
      .from('dsr_requests')
      .insert({
        user_id: user.id,
        request_type: 'portability',
        status: 'pending',
        requested_by: user.id
      })
      .select()
      .single();

    if (dsrError) {
      logger.error('Error creating DSR request', dsrError, {
        service: 'gdpr',
        userId: user.id,
        requestType: 'portability'
      });
      return NextResponse.json({ 
        error: 'Failed to create data export request' 
      }, { status: 500 });
    }

    // Export user data
    const { data: exportData, error: exportError } = await serverSupabase
      .rpc('export_user_data', { p_user_id: user.id });

    if (exportError) {
      logger.error('Error exporting user data', exportError, {
        service: 'gdpr',
        userId: user.id,
        requestId: dsrRequest.id
      });
      return NextResponse.json({ 
        error: 'Failed to export user data' 
      }, { status: 500 });
    }

    // Update DSR request status
    await serverSupabase
      .from('dsr_requests')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        data_export_path: 'exported'
      })
      .eq('id', dsrRequest.id);

    // Format export data
    const formattedData: FormattedExportData = {
      user_id: user.id,
      export_date: new Date().toISOString(),
      data: (exportData as ExportDataRow[]).reduce((acc: Record<string, Record<string, unknown>[]>, row: ExportDataRow) => {
        if (!acc[row.table_name]) {
          acc[row.table_name] = [];
        }
        acc[row.table_name].push(row.data);
        return acc;
      }, {})
    };

    logger.info('Data export completed successfully', {
      service: 'gdpr',
      userId: user.id,
      requestId: dsrRequest.id
    });

    return NextResponse.json({
      message: 'Data export completed successfully',
      request_id: dsrRequest.id,
      data: formattedData
    });

  } catch (error) {
    logger.error('GDPR export error', error, { service: 'gdpr' });
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    );
  }
}
