import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';

const certificationUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  issuer: z.string().min(1).max(255).optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  credentialId: z.string().max(100).optional().nullable(),
  documentUrl: z.string().url().optional().nullable(),
  category: z.enum(['safety', 'electrical', 'plumbing', 'kitchen', 'general', 'other']).optional(),
});

/**
 * GET /api/contractor/certifications/[id]
 * Get a specific certification
 */
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (_request, { user, params }) => {
    const { id } = params;

    const { data: certification, error } = await serverSupabase
      .from('contractor_certifications')
      .select('id, name, issuer, issue_date, expiry_date, credential_id, document_url, is_verified, category, contractor_id, created_at')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (error || !certification) {
      throw new NotFoundError('Certification not found');
    }

    return NextResponse.json({ certification });
  }
);

/**
 * PUT /api/contractor/certifications/[id]
 * Update a certification
 */
export const PUT = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user, params }) => {
    const { id } = params;
    const body = await request.json();
    const validation = certificationUpdateSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestError('Invalid request data');
    }
    const validatedData = validation.data;

    // Verify the certification belongs to the user
    const { data: existingCert, error: checkError } = await serverSupabase
      .from('contractor_certifications')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (checkError || !existingCert) {
      throw new NotFoundError('Certification not found');
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.issuer !== undefined) updateData.issuer = validatedData.issuer;
    if (validatedData.issueDate !== undefined) updateData.issue_date = validatedData.issueDate;
    if (validatedData.expiryDate !== undefined) updateData.expiry_date = validatedData.expiryDate;
    if (validatedData.credentialId !== undefined) updateData.credential_id = validatedData.credentialId;
    if (validatedData.documentUrl !== undefined) updateData.document_url = validatedData.documentUrl;
    if (validatedData.category !== undefined) updateData.category = validatedData.category;

    const { data: certification, error } = await serverSupabase
      .from('contractor_certifications')
      .update(updateData)
      .eq('id', id)
      .eq('contractor_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update certification', error, {
        service: 'contractor-api',
        contractorId: user.id,
        certificationId: id,
      });
      throw new InternalServerError('Failed to update certification');
    }

    logger.info('Certification updated successfully', {
      service: 'contractor-api',
      contractorId: user.id,
      certificationId: id,
    });

    return NextResponse.json({ certification });
  }
);

/**
 * DELETE /api/contractor/certifications/[id]
 * Delete a certification
 */
export const DELETE = withApiHandler(
  { roles: ['contractor'] },
  async (_request, { user, params }) => {
    const { id } = params;

    // Verify the certification belongs to the user
    const { data: existingCert, error: checkError } = await serverSupabase
      .from('contractor_certifications')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (checkError || !existingCert) {
      throw new NotFoundError('Certification not found');
    }

    const { error } = await serverSupabase
      .from('contractor_certifications')
      .delete()
      .eq('id', id)
      .eq('contractor_id', user.id);

    if (error) {
      logger.error('Failed to delete certification', error, {
        service: 'contractor-api',
        contractorId: user.id,
        certificationId: id,
      });
      throw new InternalServerError('Failed to delete certification');
    }

    logger.info('Certification deleted successfully', {
      service: 'contractor-api',
      contractorId: user.id,
      certificationId: id,
    });

    return NextResponse.json({ success: true });
  }
);
