import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { sanitizeEmail } from '@/lib/sanitizer';
import { validateRequest } from '@/lib/validation/validator';
import { gdprEmailSchema } from '@/lib/validation/schemas';
import { logger } from '@mintenance/shared';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

interface ExportDataRow {
  table_name: string;
  data: Record<string, unknown>;
}

interface FormattedExportData {
  user_id: string;
  export_date: string;
  data: Record<string, Record<string, unknown>[]>;
}

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, gdprEmailSchema);
    if ('headers' in validation) return validation;

    const { email } = validation.data;

    let sanitizedEmail: string;
    try {
      sanitizedEmail = sanitizeEmail(email);
    } catch {
      logger.warn('Invalid email format in export request', { service: 'gdpr', userId: user.id, email: email.substring(0, 3) + '***' });
      throw new BadRequestError('Invalid email format');
    }

    if (sanitizedEmail !== user.email) {
      logger.warn('Email mismatch in export request', { service: 'gdpr', userId: user.id, providedEmail: email.substring(0, 3) + '***' });
      throw new BadRequestError('Email does not match your account');
    }

    // Check if user already has a pending export request
    const { data: existingRequest } = await serverSupabase
      .from('dsr_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('request_type', 'portability')
      .in('status', ['pending', 'in_progress'])
      .single();

    if (existingRequest) throw new BadRequestError('You already have a pending data export request');

    const { data: dsrRequest, error: dsrError } = await serverSupabase
      .from('dsr_requests')
      .insert({ user_id: user.id, request_type: 'portability', status: 'pending', requested_by: user.id })
      .select()
      .single();

    if (dsrError) {
      logger.error('Error creating DSR request', dsrError, { service: 'gdpr', userId: user.id, requestType: 'portability' });
      throw new InternalServerError('Failed to create data export request');
    }

    const { data: exportData, error: exportError } = await serverSupabase.rpc('export_user_data', { p_user_id: user.id });

    if (exportError) {
      logger.error('Error exporting user data', exportError, { service: 'gdpr', userId: user.id, requestId: dsrRequest.id });
      throw new InternalServerError('Failed to export user data');
    }

    await serverSupabase.from('dsr_requests').update({ status: 'completed', completed_at: new Date().toISOString(), data_export_path: 'exported' }).eq('id', dsrRequest.id);

    const formattedData: FormattedExportData = {
      user_id: user.id,
      export_date: new Date().toISOString(),
      data: (exportData as ExportDataRow[]).reduce((acc: Record<string, Record<string, unknown>[]>, row: ExportDataRow) => {
        if (!acc[row.table_name]) acc[row.table_name] = [];
        acc[row.table_name].push(row.data);
        return acc;
      }, {}),
    };

    logger.info('Data export completed successfully', { service: 'gdpr', userId: user.id, requestId: dsrRequest.id });

    return NextResponse.json({ message: 'Data export completed successfully', request_id: dsrRequest.id, data: formattedData });
  }
);
