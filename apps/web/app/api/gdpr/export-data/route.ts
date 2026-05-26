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

    // 2026-05-26 audit-64 P2: the RPC only returns profile/jobs/bids/
    // messages (verified live), but the mobile DataExportScreen
    // promises "Payment & invoice records" and "Reviews & ratings"
    // too. Fetch the missing categories alongside the RPC and merge
    // them into the formatted data block below. Tables chosen to
    // match the UI's promised categories + the GDPR portability
    // surface: escrow_transactions + invoices (payment & invoice
    // records), reviews (reviews & ratings), contracts
    // (signed-contract surface), contractor/homeowner_subscriptions
    // (billing state for the UK Construction Act audit trail),
    // property_contacts (only when the user is the owner — others'
    // contacts mustn't leak via portability). Each fetch is
    // best-effort: a transient failure on one table won't fail the
    // whole export, just leaves that bucket empty (logged so
    // operators can spot it).
    const [
      exportRpcResult,
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
      serverSupabase.rpc('export_user_data', { p_user_id: user.id }),
      serverSupabase
        .from('escrow_transactions')
        .select('*')
        .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`),
      serverSupabase.from('invoices').select('*').eq('contractor_id', user.id),
      serverSupabase.from('invoices').select('*').eq('client_id', user.id),
      serverSupabase.from('reviews').select('*').eq('reviewer_id', user.id),
      serverSupabase.from('reviews').select('*').eq('contractor_id', user.id),
      // contracts has homeowner_id / contractor_id directly per the
      // schema verified in prior audits.
      serverSupabase.from('contracts').select('*').eq('homeowner_id', user.id),
      serverSupabase.from('contracts').select('*').eq('contractor_id', user.id),
      serverSupabase
        .from('contractor_subscriptions')
        .select('*')
        .eq('contractor_id', user.id),
      serverSupabase
        .from('homeowner_subscriptions')
        .select('*')
        .eq('homeowner_id', user.id),
      // Only the property owner sees their own contacts row —
      // never another homeowner's tenant via portability.
      serverSupabase
        .from('property_contacts')
        .select('*')
        .eq('owner_id', user.id),
    ]);

    const { data: exportData, error: exportError } = exportRpcResult;

    if (exportError) {
      logger.error('Error exporting user data', exportError, {
        service: 'gdpr',
        userId: user.id,
        requestId: dsrRequest.id,
      });
      // 2026-05-24 audit-41 P1: previously threw without touching the
      // dsr_requests row, leaving status='pending' forever. Mobile
      // (DataExportScreen) treats pending as an in-flight export and
      // disables the "Request data export" button against any user
      // with a stuck row — so one transient RPC failure permanently
      // bricked the export flow until an operator cleaned up. Mark
      // the row 'rejected' with the error message so the next request
      // is unblocked AND there's an audit trail of what failed.
      // notes is the only free-form column on dsr_requests live
      // (verified via information_schema 2026-05-24); status='rejected'
      // is in the CHECK allow-list.
      await serverSupabase
        .from('dsr_requests')
        .update({
          status: 'rejected',
          completed_at: new Date().toISOString(),
          notes: `export_user_data RPC failed: ${exportError.message ?? 'unknown error'}`,
        })
        .eq('id', dsrRequest.id);
      throw new InternalServerError('Failed to export user data');
    }

    await serverSupabase
      .from('dsr_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        data_export_path: 'exported',
      })
      .eq('id', dsrRequest.id);

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
    const logEmpty = (label: string, err: unknown) => {
      if (err) {
        logger.warn('GDPR export: table fetch failed (continuing)', {
          service: 'gdpr',
          userId: user.id,
          table: label,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    };
    logEmpty('escrow_transactions', escrowResult.error);
    logEmpty('invoices(contractor)', invoicesContractorResult.error);
    logEmpty('invoices(client)', invoicesClientResult.error);
    logEmpty('reviews(reviewer)', reviewsAsReviewerResult.error);
    logEmpty('reviews(contractor)', reviewsAsContractorResult.error);
    logEmpty('contracts(homeowner)', contractsAsHomeownerResult.error);
    logEmpty('contracts(contractor)', contractsAsContractorResult.error);
    logEmpty('contractor_subscriptions', contractorSubsResult.error);
    logEmpty('homeowner_subscriptions', homeownerSubsResult.error);
    logEmpty('property_contacts', propertyContactsResult.error);

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
