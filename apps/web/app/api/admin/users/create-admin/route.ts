import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { BadRequestError, ConflictError, InternalServerError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { sanitizeText, sanitizeEmail } from '@/lib/sanitizer';

const createAdminSchema = z.object({
  email: z.string().email('Invalid email').transform((val) => sanitizeEmail(val)),
  firstName: z
    .string()
    .min(1, 'First name required')
    .max(100)
    .transform((val) => sanitizeText(val, 100)),
  lastName: z
    .string()
    .min(1, 'Last name required')
    .max(100)
    .transform((val) => sanitizeText(val, 100)),
});

/**
 * POST /api/admin/users/create-admin
 * Create a new admin account. Only callable by existing admins.
 * Sends an invite email — the new admin sets their own password via the link.
 */
export const POST = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 5, windowMs: 60_000 } },
  async (request, { user: requestingAdmin }) => {
    const validation = await validateRequest(request, createAdminSchema);
    if (validation instanceof (await import('next/server')).NextResponse) return validation;
    const { email, firstName, lastName } = validation.data;

    // Check email domain requirement for admin accounts
    if (!email.endsWith('@mintenance.co.uk')) {
      throw new BadRequestError('Admin accounts must use a @mintenance.co.uk email address');
    }

    // Check if user already exists
    const { data: existing } = await serverSupabase
      .from('profiles')
      .select('id, role')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    // Create the user via Supabase Admin Auth API and send invite email
    const { data: authData, error: authError } = await serverSupabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite`,
      }
    );

    if (authError || !authData.user) {
      logger.error('Failed to create admin user via Supabase Auth', {
        service: 'admin',
        email,
        error: authError?.message,
      });
      throw new InternalServerError('Failed to create admin account');
    }

    // Set role='admin' in profiles table (trigger may not set this automatically)
    const { error: profileError } = await serverSupabase
      .from('profiles')
      .update({
        role: 'admin',
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authData.user.id);

    if (profileError) {
      logger.error('Failed to update profile role for new admin', {
        service: 'admin',
        userId: authData.user.id,
        email,
        error: profileError.message,
      });
      // Non-fatal: user exists in Auth, profile will be updated on first login
    }

    await AdminActivityLogger.logFromRequest(
      request,
      requestingAdmin.id,
      'create_admin',
      'user_management',
      `Admin account created for ${email}`,
      'user',
      authData.user.id,
      { email, firstName, lastName }
    );

    logger.info('Admin account created successfully', {
      service: 'admin',
      newAdminId: authData.user.id,
      email,
      createdBy: requestingAdmin.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Admin invite sent to ${email}. They must accept the invite to activate their account.`,
        user: {
          id: authData.user.id,
          email,
          firstName,
          lastName,
          role: 'admin',
        },
      },
      { status: 201 }
    );
  }
);
