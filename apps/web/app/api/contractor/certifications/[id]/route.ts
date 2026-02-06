import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

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
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor authentication required');
    }

    const { id } = await context.params;

    const { data: certification, error } = await serverSupabase
      .from('contractor_certifications')
      .select('*')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (error || !certification) {
      throw new NotFoundError('Certification not found');
    }

    return NextResponse.json({ certification });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * PUT /api/contractor/certifications/[id]
 * Update a certification
 */
export async function PUT(request: NextRequest, context: Params) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor authentication required');
    }

    const { id } = await context.params;
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
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * DELETE /api/contractor/certifications/[id]
 * Delete a certification
 */
export async function DELETE(request: NextRequest, context: Params) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor authentication required');
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
  } catch (error) {
    return handleAPIError(error);
  }
}
