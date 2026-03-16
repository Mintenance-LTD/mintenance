import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { isValidUUID } from '@/lib/validation/uuid';
import { NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import jsPDF from 'jspdf';

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

    const { data: contract, error } = await serverSupabase
      .from('contracts')
      .select(`
        id, job_id, contractor_id, homeowner_id, status, title, description, amount,
        start_date, end_date, terms, contractor_signed_at, homeowner_signed_at,
        contractor_company_name, contractor_license_registration, contractor_license_type,
        created_at, updated_at,
        contractor:profiles!contractor_id(first_name, last_name, company_name, insurance_number),
        homeowner:profiles!homeowner_id(first_name, last_name)
      `)
      .eq('id', contractId)
      .or(`contractor_id.eq.${user.id},homeowner_id.eq.${user.id}`)
      .single();

    if (error || !contract) {
      throw new NotFoundError('Contract not found or access denied');
    }

    const c = contract as Record<string, unknown>;
    const contractor = c.contractor as Record<string, string | null> | null;
    const homeowner = c.homeowner as Record<string, string | null> | null;

    const contractorName = contractor?.company_name
      || (contractor?.first_name && contractor?.last_name ? `${contractor.first_name} ${contractor.last_name}` : null)
      || (c.contractor_company_name as string)
      || 'Contractor';
    const homeownerName = homeowner?.first_name && homeowner?.last_name
      ? `${homeowner.first_name} ${homeowner.last_name}`
      : 'Homeowner';

    const formatDate = (d: string | null) => {
      if (!d) return 'N/A';
      return new Date(d as string).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
    };

    const formatDateTime = (d: string | null) => {
      if (!d) return '';
      return new Date(d as string).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    };

    const formatCurrency = (amount: number) =>
      `£${Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Generate PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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
    doc.text(`Ref: ${(c.id as string).slice(0, 8).toUpperCase()}  |  ${formatDate(c.created_at as string)}`, margin, 28);
    doc.text('Facilitated by Mintenance', pageWidth - margin, 28, { align: 'right' });

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
      doc.text(`License: ${c.contractor_license_registration}${c.contractor_license_type ? ` (${c.contractor_license_type})` : ''}`, margin + 30, y);
      y += 5;
    }

    const insuranceProvider = (c.terms as Record<string, unknown>)?.insurance_provider as string | undefined;
    const insuranceNumber = contractor?.insurance_number;
    if (insuranceProvider || insuranceNumber) {
      doc.text(`Insurance: ${insuranceProvider || 'Yes'}${insuranceNumber ? ` — ${insuranceNumber}` : ''}`, margin + 30, y);
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
      const descLines = doc.splitTextToSize(c.description as string, contentWidth);
      checkPage(descLines.length * 5 + 5);
      doc.text(descLines, margin, y);
      y += descLines.length * 5 + 5;
    }

    addLine();

    // Section 3: Payment
    checkPage(25);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3. PAYMENT TERMS', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Contract Amount: ${formatCurrency(c.amount as number)}`, margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Payment held in escrow via Mintenance until work is completed and approved.', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    addLine();

    // Section 4: Schedule
    if (c.start_date || c.end_date) {
      checkPage(25);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('4. SCHEDULE', margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (c.start_date) {
        doc.text(`Start Date: ${formatDate(c.start_date as string)}`, margin, y);
        y += 6;
      }
      if (c.end_date) {
        doc.text(`Completion Date: ${formatDate(c.end_date as string)}`, margin, y);
        y += 6;
      }
      y += 4;
      addLine();
    }

    // Section 5: Additional Terms
    const terms = c.terms as Record<string, unknown> | null;
    const hiddenKeys = ['insurance_provider', 'insurance_policy_number', 'source', 'bid_id', 'created_from'];
    const visibleTerms = terms
      ? Object.entries(terms).filter(([key]) => !hiddenKeys.includes(key))
      : [];

    if (visibleTerms.length > 0) {
      checkPage(20 + visibleTerms.length * 6);
      const sectionNum = (c.start_date || c.end_date) ? '5' : '4';
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${sectionNum}. ADDITIONAL TERMS`, margin, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      for (const [key, value] of visibleTerms) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
    const sigSectionNum = visibleTerms.length > 0
      ? ((c.start_date || c.end_date) ? '6' : '5')
      : ((c.start_date || c.end_date) ? '5' : '4');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sigSectionNum}. SIGNATURES`, margin, y);
    y += 10;

    // Contractor signature
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Contractor:', margin, y);
    doc.setFont('helvetica', 'normal');
    if (c.contractor_signed_at) {
      doc.text(`Signed by ${contractorName} on ${formatDateTime(c.contractor_signed_at as string)}`, margin + 30, y);
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
      doc.text(`Signed by ${homeownerName} on ${formatDateTime(c.homeowner_signed_at as string)}`, margin + 30, y);
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
    doc.text('This contract is facilitated by Mintenance. Payments are held in escrow.', margin, y + 3);
    doc.text('By signing, both parties agree to the terms above.', margin, y + 8);

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
  },
);
