import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { InternalServerError, BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const certificationSchema = z.object({
  name: z.string().min(1, 'Certification name is required').max(255),
  issuer: z.string().min(1, 'Issuer is required').max(255),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().nullable(),
  credentialId: z.string().max(100).optional().nullable(),
  documentUrl: z.string().url().optional().nullable(),
  category: z.enum(['safety', 'electrical', 'plumbing', 'kitchen', 'general', 'other']).default('general'),
});

export const GET = withApiHandler({ roles: ['contractor'], rateLimit: { maxRequests: 30 } }, async (_req, { user }) => {
  const { data: certifications, error } = await serverSupabase.from('contractor_certifications').select('id, name, issuer, issue_date, expiry_date, credential_id, document_url, is_verified, category').eq('contractor_id', user.id).order('issue_date', { ascending: false });

  if (error) {
    logger.error('Failed to fetch certifications', error, { service: 'contractor-api', contractorId: user.id });
    throw new InternalServerError('Failed to fetch certifications');
  }

  const today = new Date();
  const certificationsWithStatus = (certifications || []).map((cert: { expiry_date?: string; [key: string]: unknown }) => {
    let status: 'active' | 'expiring_soon' | 'expired' = 'active';
    if (cert.expiry_date) {
      const daysUntilExpiry = Math.ceil((new Date(cert.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0) status = 'expired';
      else if (daysUntilExpiry <= 30) status = 'expiring_soon';
    }
    return { id: cert.id, name: cert.name, issuer: cert.issuer, issueDate: cert.issue_date, expiryDate: cert.expiry_date, credentialId: cert.credential_id, documentUrl: cert.document_url, status, verified: cert.is_verified, category: cert.category };
  });

  return NextResponse.json({ certifications: certificationsWithStatus });
});

export const POST = withApiHandler({ roles: ['contractor'], rateLimit: { maxRequests: 30 } }, async (request, { user }) => {
  const body = await request.json();
  const validation = certificationSchema.safeParse(body);
  if (!validation.success) throw new BadRequestError('Invalid request data');
  const validatedData = validation.data;

  const { data: certification, error } = await serverSupabase.from('contractor_certifications').insert({
    contractor_id: user.id, name: validatedData.name, issuer: validatedData.issuer, issue_date: validatedData.issueDate,
    expiry_date: validatedData.expiryDate || null, credential_id: validatedData.credentialId || null,
    document_url: validatedData.documentUrl || null, category: validatedData.category,
  }).select().single();

  if (error) {
    logger.error('Failed to create certification', error, { service: 'contractor-api', contractorId: user.id });
    throw new InternalServerError('Failed to create certification');
  }

  logger.info('Certification created successfully', { service: 'contractor-api', contractorId: user.id, certificationId: certification.id });

  return NextResponse.json({ certification }, { status: 201 });
});
