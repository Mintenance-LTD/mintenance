import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { isValidUUID } from '@/lib/validation/uuid';
import {
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import jsPDF from 'jspdf';

// Allow up to 60 seconds for PDF generation (jsPDF is CPU-intensive)
export const maxDuration = 60;

/**
 * GET /api/contracts/[id]/pdf
 * Generate and return a PDF of the contract
 */
export const GET = withApiHandler(
  { csrf: false },
  async (_request, { user, params }) => {
    const { id: contractId } = params;

    if (!isValidUUID(contractId)) {
      throw new BadRequestError('Invalid contract ID format');
    }

    // 2026-05-13 PDF audit:
    //   - `profiles.insurance_number` does NOT exist on the live
    //     schema (only `insurance_expiry_date`); the previous select
    //     returned silent nulls and the insurance line never rendered
    //     a policy number. Pull the policy number from
    //     `contracts.terms.insurance_policy_number` instead (now
    //     populated by the auto-create-on-bid-accept flow).
    //   - Embed the linked `contractor_quotes` row so the PDF can
    //     surface the per-line cost breakdown + VAT + contractor
    //     terms text that the homeowner saw on the web UI. Same
    //     embed shape as the contracts GET endpoint.
    const { data: contract, error } = await serverSupabase
      .from('contracts')
      .select(
        `
        id, job_id, contractor_id, homeowner_id, status, title, description, amount,
        start_date, end_date, terms, contractor_signed_at, homeowner_signed_at,
        contractor_company_name, contractor_license_registration, contractor_license_type,
        quote_id, created_at, updated_at,
        contractor:profiles!contractor_id(first_name, last_name, company_name, insurance_expiry_date),
        homeowner:profiles!homeowner_id(first_name, last_name),
        quote:contractor_quotes!quote_id(id, subtotal, tax_rate, tax_amount, total_amount, line_items, terms, quote_number)
      `
      )
      .eq('id', contractId)
      .or(`contractor_id.eq.${user.id},homeowner_id.eq.${user.id}`)
      .single();

    // Distinguish a genuine "no row / no access" from a real query
    // failure. PostgREST returns code PGRST116 when `.single()` matches
    // zero rows — that is the legitimate 404. Any OTHER error code is a
    // schema/embed/RLS failure and must NOT be disguised as "not found"
    // (a stale `profiles.insurance_number` select once failed exactly
    // this way and surfaced a misleading 404). Log it and return 500 so
    // it is diagnosable.
    if (error && error.code !== 'PGRST116') {
      logger.error('Contract PDF query failed', {
        contractId,
        code: error.code,
        message: error.message,
        details: error.details,
      });
      throw new InternalServerError(
        'Could not load the contract for PDF export'
      );
    }

    if (error || !contract) {
      throw new NotFoundError('Contract not found or access denied');
    }

    const c = contract as Record<string, unknown>;

    // 2026-05-21 drift fallback (mirrors /api/contracts GET): if this
    // contract was created before the bid-accept flow propagated
    // `quote_id`, hydrate it from the linked bid so the PDF's Quote
    // Breakdown section can still render. Also recover the bid's
    // message into description when the row still carries boilerplate.
    const termsForFallback =
      (c.terms as Record<string, unknown> | null) ?? null;
    const fallbackBidId = termsForFallback?.bid_id as string | undefined;
    if (!c.quote_id && fallbackBidId) {
      const { data: bid } = await serverSupabase
        .from('bids')
        .select(
          'quote_id, message, description, quote:contractor_quotes!quote_id(id, subtotal, tax_rate, tax_amount, total_amount, line_items, terms, quote_number)'
        )
        .eq('id', fallbackBidId)
        .maybeSingle();
      if (bid) {
        if (bid.quote_id && !c.quote_id) c.quote_id = bid.quote_id;
        if (bid.quote && !c.quote) c.quote = bid.quote;
        const proposalText = (
          (bid.message as string | null) ??
          (bid.description as string | null) ??
          ''
        )
          .toString()
          .trim();
        const desc = c.description as string | null | undefined;
        const looksLikeBoilerplate =
          !desc ||
          desc.length === 0 ||
          (desc as string).startsWith('Contract created from accepted bid');
        if (looksLikeBoilerplate && proposalText) {
          c.description = proposalText;
        }
      }
    }
    const contractor = c.contractor as Record<string, string | null> | null;
    const homeowner = c.homeowner as Record<string, string | null> | null;

    const contractorName =
      contractor?.company_name ||
      (contractor?.first_name && contractor?.last_name
        ? `${contractor.first_name} ${contractor.last_name}`
        : null) ||
      (c.contractor_company_name as string) ||
      'Contractor';
    const homeownerName =
      homeowner?.first_name && homeowner?.last_name
        ? `${homeowner.first_name} ${homeowner.last_name}`
        : 'Homeowner';

    const formatDate = (d: string | null) => {
      if (!d) return 'N/A';
      return new Date(d as string).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    };

    const formatDateTime = (d: string | null) => {
      if (!d) return '';
      return new Date(d as string).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatCurrency = (amount: number) =>
      `£${Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Generate PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const addLine = () => {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
    };

    const checkPage = (needed: number) => {
      if (y + needed > 270) {
        doc.addPage();
        y = 20;
      }
    };

    // Header
    doc.setFillColor(13, 148, 136); // teal-600
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTRACT AGREEMENT', margin, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Ref: ${(c.id as string).slice(0, 8).toUpperCase()}  |  ${formatDate(c.created_at as string)}`,
      margin,
      28
    );
    doc.text('Facilitated by Mintenance', pageWidth - margin, 28, {
      align: 'right',
    });

    y = 45;
    doc.setTextColor(0, 0, 0);

    // Section 1: Parties
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. PARTIES', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Contractor:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(contractorName, margin + 30, y);
    y += 6;

    if (c.contractor_license_registration) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(
        `License: ${c.contractor_license_registration}${c.contractor_license_type ? ` (${c.contractor_license_type})` : ''}`,
        margin + 30,
        y
      );
      y += 5;
    }

    const termsRecord = (c.terms as Record<string, unknown> | null) ?? {};
    const insuranceProvider = termsRecord.insurance_provider as
      | string
      | undefined;
    const insurancePolicyNumber = termsRecord.insurance_policy_number as
      | string
      | undefined;
    if (insuranceProvider || insurancePolicyNumber) {
      doc.text(
        `Insurance: ${insuranceProvider || 'Yes'}${insurancePolicyNumber ? ` — ${insurancePolicyNumber}` : ''}`,
        margin + 30,
        y
      );
      y += 5;
    }

    y += 2;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Homeowner:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(homeownerName, margin + 30, y);
    y += 10;

    addLine();

    // Section 2: Scope of Work
    checkPage(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. SCOPE OF WORK', margin, y);
    y += 8;

    if (c.title) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(c.title as string, margin, y);
      y += 6;
    }

    if (c.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const descLines = doc.splitTextToSize(
        c.description as string,
        contentWidth
      );
      checkPage(descLines.length * 5 + 5);
      doc.text(descLines, margin, y);
      y += descLines.length * 5 + 5;
    }

    addLine();

    // Section numbering is now driven by a counter so newly-inserted
    // sections (e.g. the 2026-05-13 quote breakdown) don't force a
    // cascade of literal-string edits. `nextSection()` returns the
    // next index and renders the heading in one call.
    let sectionIndex = 2; // §1 Parties already rendered above
    const writeHeading = (label: string) => {
      sectionIndex += 1;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${sectionIndex}. ${label}`, margin, y);
      y += 8;
    };

    // Section 3: Payment
    checkPage(25);
    writeHeading('PAYMENT TERMS');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Contract Amount: ${formatCurrency(c.amount as number)}`,
      margin,
      y
    );
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      'Payment held in escrow via Mintenance until work is completed and approved.',
      margin,
      y
    );
    doc.setTextColor(0, 0, 0);
    y += 10;

    addLine();

    // Section: Quote Breakdown (only when a `contractor_quotes` row is
    // linked and carries an itemised breakdown / VAT / terms text).
    // 2026-05-13: previously absent from the PDF even though the data
    // existed on the linked quote — homeowners and contractors had
    // matching gaps on web display + PDF export.
    interface QuoteLineItem {
      description?: string;
      type?: string;
      quantity?: number;
      unitPrice?: number;
      total?: number;
    }
    const quote = (Array.isArray(c.quote) ? c.quote[0] : c.quote) as
      | (Record<string, unknown> & { line_items?: QuoteLineItem[] })
      | null;
    const quoteLineItems: QuoteLineItem[] = Array.isArray(quote?.line_items)
      ? quote!.line_items
      : [];
    const quoteHasTax =
      typeof quote?.tax_amount === 'number' && (quote.tax_amount as number) > 0;
    const quoteHasTerms =
      typeof quote?.terms === 'string' &&
      (quote.terms as string).trim().length > 0;

    if (quote && (quoteLineItems.length > 0 || quoteHasTax || quoteHasTerms)) {
      checkPage(30 + quoteLineItems.length * 6);
      writeHeading('QUOTE BREAKDOWN');

      if (quoteLineItems.length > 0) {
        // Simple two-column line-item table — keep it readable on A4
        // without bringing in a table plugin.
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Item', margin, y);
        doc.text('Qty', margin + 110, y, { align: 'right' });
        doc.text('Unit', margin + 135, y, { align: 'right' });
        doc.text('Total', pageWidth - margin, y, { align: 'right' });
        y += 5;
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y - 1, pageWidth - margin, y - 1);
        doc.setFont('helvetica', 'normal');

        for (const item of quoteLineItems) {
          const desc = item.description ?? '—';
          const qty = typeof item.quantity === 'number' ? item.quantity : 0;
          const unit =
            typeof item.unitPrice === 'number'
              ? formatCurrency(item.unitPrice)
              : '—';
          const total =
            typeof item.total === 'number' ? formatCurrency(item.total) : '—';
          const lines = doc.splitTextToSize(desc, 90);
          checkPage(Math.max(lines.length, 1) * 5 + 2);
          doc.text(lines, margin, y);
          doc.text(String(qty), margin + 110, y, { align: 'right' });
          doc.text(unit, margin + 135, y, { align: 'right' });
          doc.text(total, pageWidth - margin, y, { align: 'right' });
          y += Math.max(lines.length, 1) * 5 + 1;
        }
        y += 2;
      }

      if (quoteHasTax) {
        checkPage(20);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        if (typeof quote?.subtotal === 'number') {
          doc.text(
            `Subtotal: ${formatCurrency(quote.subtotal as number)}`,
            pageWidth - margin,
            y,
            { align: 'right' }
          );
          y += 5;
        }
        const rateStr =
          typeof quote?.tax_rate === 'number' && (quote.tax_rate as number) > 0
            ? ` (${quote.tax_rate}%)`
            : '';
        doc.text(
          `VAT${rateStr}: ${formatCurrency(quote!.tax_amount as number)}`,
          pageWidth - margin,
          y,
          { align: 'right' }
        );
        y += 5;
        if (typeof quote?.total_amount === 'number') {
          doc.setFont('helvetica', 'bold');
          doc.text(
            `Quote Total: ${formatCurrency(quote.total_amount as number)}`,
            pageWidth - margin,
            y,
            { align: 'right' }
          );
          y += 6;
          doc.setFont('helvetica', 'normal');
        }
      }

      if (quoteHasTerms) {
        checkPage(20);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("Contractor's Terms:", margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const termsLines = doc.splitTextToSize(
          quote!.terms as string,
          contentWidth
        );
        checkPage(termsLines.length * 4 + 3);
        doc.text(termsLines, margin, y);
        y += termsLines.length * 4 + 4;
      }
      addLine();
    }

    // Section: Schedule
    if (c.start_date || c.end_date) {
      checkPage(25);
      writeHeading('SCHEDULE');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (c.start_date) {
        doc.text(
          `Start Date: ${formatDate(c.start_date as string)}`,
          margin,
          y
        );
        y += 6;
      }
      if (c.end_date) {
        doc.text(
          `Completion Date: ${formatDate(c.end_date as string)}`,
          margin,
          y
        );
        y += 6;
      }
      y += 4;
      addLine();
    }

    // Section: Additional Terms — same hidden-keys list as the web
    // UI (apps/web/app/jobs/[id]/components/contract/contractHelpers.ts)
    // so the two surfaces stay in sync.
    const terms = c.terms as Record<string, unknown> | null;
    const hiddenKeys = [
      'insurance_provider',
      'insurance_policy_number',
      'insurance_expiry_date',
      'source',
      'bid_id',
      'created_from',
    ];
    const visibleTerms = terms
      ? Object.entries(terms).filter(([key]) => !hiddenKeys.includes(key))
      : [];

    if (visibleTerms.length > 0) {
      checkPage(20 + visibleTerms.length * 6);
      writeHeading('ADDITIONAL TERMS');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      for (const [key, value] of visibleTerms) {
        const label = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
        const val = typeof value === 'string' ? value : JSON.stringify(value);
        const lines = doc.splitTextToSize(`${label}: ${val}`, contentWidth);
        checkPage(lines.length * 5);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 2;
      }
      y += 3;
      addLine();
    }

    // Signatures
    checkPage(50);
    writeHeading('SIGNATURES');
    y += 2;

    // Contractor signature
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Contractor:', margin, y);
    doc.setFont('helvetica', 'normal');
    if (c.contractor_signed_at) {
      doc.text(
        `Signed by ${contractorName} on ${formatDateTime(c.contractor_signed_at as string)}`,
        margin + 30,
        y
      );
    } else {
      doc.setTextColor(150, 150, 150);
      doc.text('Awaiting signature', margin + 30, y);
      doc.setTextColor(0, 0, 0);
    }
    y += 12;

    // Homeowner signature
    doc.setFont('helvetica', 'bold');
    doc.text('Homeowner:', margin, y);
    doc.setFont('helvetica', 'normal');
    if (c.homeowner_signed_at) {
      doc.text(
        `Signed by ${homeownerName} on ${formatDateTime(c.homeowner_signed_at as string)}`,
        margin + 30,
        y
      );
    } else {
      doc.setTextColor(150, 150, 150);
      doc.text('Awaiting signature', margin + 30, y);
      doc.setTextColor(0, 0, 0);
    }
    y += 15;

    // Footer
    addLine();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'This contract is facilitated by Mintenance. Payments are held in escrow.',
      margin,
      y + 3
    );
    doc.text(
      'By signing, both parties agree to the terms above.',
      margin,
      y + 8
    );

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const filename = `Contract-${(c.id as string).slice(0, 8).toUpperCase()}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  }
);
