import { readExportCore } from '@/lib/privacy/read-export-core';
import { readExportRows } from '@/lib/privacy/read-export-rows';
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
      logger.warn('Invalid email format in export request', {
        service: 'gdpr',
        userId: user.id,
        email: email.substring(0, 3) + '***',
      });
      throw new BadRequestError('Invalid email format');
    }

    if (sanitizedEmail !== user.email) {
      logger.warn('Email mismatch in export request', {
        service: 'gdpr',
        userId: user.id,
        providedEmail: email.substring(0, 3) + '***',
      });
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

    if (existingRequest)
      throw new BadRequestError(
        'You already have a pending data export request'
      );

    const { data: dsrRequest, error: dsrError } = await serverSupabase
      .from('dsr_requests')
      .insert({
        user_id: user.id,
        request_type: 'portability',
        status: 'pending',
        requested_by: user.id,
      })
      .select()
      .single();

    if (dsrError) {
      logger.error('Error creating DSR request', dsrError, {
        service: 'gdpr',
        userId: user.id,
        requestType: 'portability',
      });
      throw new InternalServerError('Failed to create data export request');
    }

    // Every category must finish successfully before a download is marked complete.
    const [
      coreResult,
      escrowResult,
      invoicesContractorResult,
      invoicesClientResult,
      reviewsAsReviewerResult,
      reviewsAsContractorResult,
      contractsAsHomeownerResult,
      contractsAsContractorResult,
      contractorSubsResult,
      homeownerSubsResult,
      propertyContactsResult,
    ] = await Promise.all([
      readExportCore(user.id),
      readExportRows(() =>
        serverSupabase
          .from('escrow_transactions')
          .select('*')
          .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
      ),
      readExportRows(() =>
        serverSupabase.from('invoices').select('*').eq('contractor_id', user.id)
      ),
      readExportRows(() =>
        serverSupabase.from('invoices').select('*').eq('client_id', user.id)
      ),
      readExportRows(() =>
        serverSupabase.from('reviews').select('*').eq('reviewer_id', user.id)
      ),
      readExportRows(() =>
        serverSupabase.from('reviews').select('*').eq('reviewee_id', user.id)
      ),
      // contracts has homeowner_id / contractor_id directly per the
      // schema verified in prior audits.
      readExportRows(() =>
        serverSupabase.from('contracts').select('*').eq('homeowner_id', user.id)
      ),
      readExportRows(() =>
        serverSupabase
          .from('contracts')
          .select('*')
          .eq('contractor_id', user.id)
      ),
      readExportRows(() =>
        serverSupabase
          .from('contractor_subscriptions')
          .select('*')
          .eq('contractor_id', user.id)
      ),
      readExportRows(() =>
        serverSupabase
          .from('homeowner_subscriptions')
          .select('*')
          .eq('homeowner_id', user.id)
      ),
      // Only the property owner sees their own contacts row —
      // never another homeowner's tenant via portability.
      readExportRows(() =>
        serverSupabase
          .from('property_contacts')
          .select('*')
          .eq('owner_id', user.id)
      ),
    ]);

    const { data: exportData, error: exportError } = coreResult;

    if (exportError) {
      logger.error('Error exporting user data', exportError, {
        service: 'gdpr',
        userId: user.id,
        requestId: dsrRequest.id,
      });
      // A failed export must not leave a pending request blocking retries.
      await serverSupabase
        .from('dsr_requests')
        .update({
          status: 'rejected',
          completed_at: new Date().toISOString(),
          notes: `Core export failed: ${exportError.message ?? 'unknown error'}`,
        })
        .eq('id', dsrRequest.id);
      throw new InternalServerError('Failed to export user data');
    }

    const formattedData: FormattedExportData = {
      user_id: user.id,
      export_date: new Date().toISOString(),
      data: (exportData as ExportDataRow[]).reduce(
        (
          acc: Record<string, Record<string, unknown>[]>,
          row: ExportDataRow
        ) => {
          if (!acc[row.table_name]) acc[row.table_name] = [];
          acc[row.table_name].push(row.data);
          return acc;
        },
        {}
      ),
    };

    // 2026-05-26 audit-64 P2: merge the audit-extended buckets in.
    // De-dupe contracts / invoices / reviews where the user appears
    // on both sides (e.g. contractor reviewing own job) by `id`.
    const dedupeById = (
      rows: Array<Record<string, unknown>> | null | undefined
    ): Record<string, unknown>[] => {
      if (!rows) return [];
      const seen = new Set<string>();
      const out: Record<string, unknown>[] = [];
      for (const r of rows) {
        const id = typeof r.id === 'string' ? r.id : JSON.stringify(r);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(r);
      }
      return out;
    };
    const categoryResults = [
      escrowResult,
      invoicesContractorResult,
      invoicesClientResult,
      reviewsAsReviewerResult,
      reviewsAsContractorResult,
      contractsAsHomeownerResult,
      contractsAsContractorResult,
      contractorSubsResult,
      homeownerSubsResult,
      propertyContactsResult,
    ];
    if (categoryResults.some((result) => result.error)) {
      await serverSupabase
        .from('dsr_requests')
        .update({
          status: 'rejected',
          completed_at: new Date().toISOString(),
          notes: 'Export category unavailable; retry required',
        })
        .eq('id', dsrRequest.id);
      throw new InternalServerError(
        'Your complete export is unavailable. Please retry.'
      );
    }

    formattedData.data.escrow_transactions = dedupeById(escrowResult.data);
    formattedData.data.invoices = dedupeById([
      ...(invoicesContractorResult.data ?? []),
      ...(invoicesClientResult.data ?? []),
    ]);
    formattedData.data.reviews = dedupeById([
      ...(reviewsAsReviewerResult.data ?? []),
      ...(reviewsAsContractorResult.data ?? []),
    ]);
    formattedData.data.contracts = dedupeById([
      ...(contractsAsHomeownerResult.data ?? []),
      ...(contractsAsContractorResult.data ?? []),
    ]);
    formattedData.data.contractor_subscriptions = dedupeById(
      contractorSubsResult.data
    );
    formattedData.data.homeowner_subscriptions = dedupeById(
      homeownerSubsResult.data
    );
    formattedData.data.property_contacts = dedupeById(
      propertyContactsResult.data
    );

    const { error: completionError } = await serverSupabase
      .from('dsr_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        data_export_path: 'exported',
      })
      .eq('id', dsrRequest.id);
    if (completionError)
      throw new InternalServerError(
        'Unable to finalize export. Please retry later.'
      );

    logger.info('Data export completed successfully', {
      service: 'gdpr',
      userId: user.id,
      requestId: dsrRequest.id,
    });

    return NextResponse.json({
      message: 'Data export completed successfully',
      request_id: dsrRequest.id,
      data: formattedData,
    });
  }
);
