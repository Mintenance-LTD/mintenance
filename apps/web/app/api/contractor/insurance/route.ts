import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError, BadRequestError } from '@/lib/errors/api-error';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

// GET: Fetch all insurance policies and licenses for the contractor
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (_request, { user }) => {
    const [insuranceResult, licensesResult] = await Promise.all([
      serverSupabase
        .from('contractor_insurance')
        .select('*')
        .eq('contractor_id', user.id)
        .order('expiry_date', { ascending: true }),
      serverSupabase
        .from('contractor_licenses')
        .select('*')
        .eq('contractor_id', user.id)
        .order('expiry_date', { ascending: true }),
    ]);

    if (insuranceResult.error) {
      logger.error('Error fetching insurance', insuranceResult.error, { service: 'insurance', userId: user.id });
      throw new InternalServerError('Failed to fetch insurance');
    }
    if (licensesResult.error) {
      logger.error('Error fetching licenses', licensesResult.error, { service: 'insurance', userId: user.id });
      throw new InternalServerError('Failed to fetch licenses');
    }

    const insurances = (insuranceResult.data || []).map((i: Record<string, unknown>) => ({
      id: i.id,
      type: i.type,
      provider: i.provider,
      policyNumber: i.policy_number || '',
      coverageAmount: Number(i.coverage_amount || 0),
      premium: Number(i.premium || 0),
      startDate: i.start_date,
      expiryDate: i.expiry_date,
      status: i.status,
      documentUrl: i.document_url || null,
      contactName: i.contact_name || null,
      contactPhone: i.contact_phone || null,
      contactEmail: i.contact_email || null,
      notes: i.notes || null,
    }));

    const licenses = (licensesResult.data || []).map((l: Record<string, unknown>) => ({
      id: l.id,
      name: l.name,
      number: l.number || '',
      issuer: l.issuer || '',
      issueDate: l.issue_date,
      expiryDate: l.expiry_date || null,
      status: l.status,
      documentUrl: l.document_url || null,
      notes: l.notes || null,
    }));

    return NextResponse.json({ insurances, licenses });
  }
);

const createInsuranceSchema = z.object({
  itemType: z.literal('insurance'),
  type: z.string().min(1).max(200),
  provider: z.string().min(1).max(200),
  policyNumber: z.string().max(100).optional(),
  coverageAmount: z.number().min(0).optional(),
  premium: z.number().min(0).optional(),
  startDate: z.string().min(1),
  expiryDate: z.string().min(1),
  contactName: z.string().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().optional(),
  notes: z.string().max(1000).optional(),
});

const createLicenseSchema = z.object({
  itemType: z.literal('license'),
  name: z.string().min(1).max(200),
  number: z.string().max(100).optional(),
  issuer: z.string().min(1).max(200),
  issueDate: z.string().min(1),
  expiryDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

const createSchema = z.discriminatedUnion('itemType', [createInsuranceSchema, createLicenseSchema]);

// POST: Create insurance or license
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const validation = await validateRequest(request, createSchema);
    if (validation instanceof NextResponse) return validation;

    const d = validation.data;

    if (d.itemType === 'insurance') {
      const { data: item, error } = await serverSupabase
        .from('contractor_insurance')
        .insert({
          contractor_id: user.id,
          type: d.type,
          provider: d.provider,
          policy_number: d.policyNumber || '',
          coverage_amount: d.coverageAmount || 0,
          premium: d.premium || 0,
          start_date: d.startDate,
          expiry_date: d.expiryDate,
          status: 'active',
          contact_name: d.contactName || null,
          contact_phone: d.contactPhone || null,
          contact_email: d.contactEmail || null,
          notes: d.notes || null,
        })
        .select('*')
        .single();

      if (error) {
        logger.error('Error creating insurance', error, { service: 'insurance', userId: user.id });
        throw new InternalServerError('Failed to create insurance');
      }

      return NextResponse.json({ insurance: item }, { status: 201 });
    }

    // License
    const { data: item, error } = await serverSupabase
      .from('contractor_licenses')
      .insert({
        contractor_id: user.id,
        name: d.name,
        number: d.number || '',
        issuer: d.issuer,
        issue_date: d.issueDate,
        expiry_date: d.expiryDate || null,
        status: 'active',
        notes: d.notes || null,
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Error creating license', error, { service: 'insurance', userId: user.id });
      throw new InternalServerError('Failed to create license');
    }

    return NextResponse.json({ license: item }, { status: 201 });
  }
);

// DELETE: Remove insurance or license
export const DELETE = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const itemType = url.searchParams.get('type'); // 'insurance' or 'license'
    if (!id) throw new BadRequestError('Missing id');
    if (!itemType || !['insurance', 'license'].includes(itemType)) {
      throw new BadRequestError('Missing or invalid type parameter (insurance or license)');
    }

    const table = itemType === 'insurance' ? 'contractor_insurance' : 'contractor_licenses';

    const { data: existing } = await serverSupabase
      .from(table)
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const { error } = await serverSupabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('contractor_id', user.id);

    if (error) {
      logger.error(`Error deleting ${itemType}`, error, { service: 'insurance', userId: user.id });
      throw new InternalServerError(`Failed to delete ${itemType}`);
    }

    return NextResponse.json({ success: true });
  }
);
