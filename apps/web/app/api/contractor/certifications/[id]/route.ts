import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { z } from 'zod';
import { logger } from '@mintenance/shared';

const certificationUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  issuer: z.string().min(1).max(255).optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  credentialId: z.string().max(100).optional().nullable(),
  documentUrl: z.string().url().optional().nullable(),
  category: z.enum(['safety', 'electrical', 'plumbing', 'kitchen', 'general', 'other']).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/contractor/certifications/[id]
 * Get a specific certification
 */
export async function GET(request: NextRequest, context: Params) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const { data: certification, error } = await serverSupabase
      .from('contractor_certifications')
      .select('*')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (error || !certification) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
    }

    return NextResponse.json({ certification });
  } catch (error) {
    logger.error('Error fetching certification', error, { service: 'contractor-api' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/contractor/certifications/[id]
 * Update a certification
 */
export async function PUT(request: NextRequest, context: Params) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const validatedData = certificationUpdateSchema.parse(body);

    // Verify the certification belongs to the user
    const { data: existingCert, error: checkError } = await serverSupabase
      .from('contractor_certifications')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (checkError || !existingCert) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
    }

    // Build update object
    const updateData: any = {};
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
      return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 });
    }

    logger.info('Certification updated successfully', {
      service: 'contractor-api',
      contractorId: user.id,
      certificationId: id,
    });

    return NextResponse.json({ certification });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error updating certification', error, { service: 'contractor-api' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/contractor/certifications/[id]
 * Delete a certification
 */
export async function DELETE(request: NextRequest, context: Params) {
  try {
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Verify the certification belongs to the user
    const { data: existingCert, error: checkError } = await serverSupabase
      .from('contractor_certifications')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (checkError || !existingCert) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
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
      return NextResponse.json({ error: 'Failed to delete certification' }, { status: 500 });
    }

    logger.info('Certification deleted successfully', {
      service: 'contractor-api',
      contractorId: user.id,
      certificationId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting certification', error, { service: 'contractor-api' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
