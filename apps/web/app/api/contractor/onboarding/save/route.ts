import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { OnboardingService } from '@/lib/services/OnboardingService';

/**
 * POST /api/contractor/onboarding/save
 *
 * Step-aware save endpoint for `/contractor/onboarding` wizard.
 *
 * 2026-05-13 audit fix: the wizard previously POSTed to
 * `/api/profiles/update` which never existed — every save 404'd
 * silently. The wizard's saveStep caught the error and only showed
 * a "Could not save progress" toast, then continued forward, so the
 * contractor's business name, phone, skills, service area, etc.
 * never persisted. handleFinish also never marked onboarding
 * complete, so the DB flag stayed `false` forever.
 *
 * Per-step routing:
 *   step=1 "business" → profiles (company_name, phone, years_experience, bio)
 *   step=2 "skills"   → contractor_skills (delete + reinsert) + profiles
 *                       (license_number, insurance_provider)
 *   step=3 "serviceArea" → profiles (service_postcode, service_radius_miles)
 *   step=4 "finish"   → OnboardingService.markOnboardingComplete
 */

const businessSchema = z.object({
  step: z.literal('business'),
  business_name: z.string().max(255).optional().default(''),
  phone: z
    .union([z.string().regex(/^[\d\s\-()+]{0,20}$/), z.literal('')])
    .optional()
    .default(''),
  years_experience: z.number().int().min(0).max(80).nullable().optional(),
  bio: z.string().max(2000).optional().default(''),
});

const skillsSchema = z.object({
  step: z.literal('skills'),
  skills: z.array(z.string().min(1).max(100)).max(50).default([]),
  license_number: z.string().max(100).optional().default(''),
  insurance_provider: z.string().max(255).optional().default(''),
});

const serviceAreaSchema = z.object({
  step: z.literal('serviceArea'),
  service_radius_miles: z.number().int().min(1).max(200).default(10),
  service_postcode: z.string().max(20).optional().default(''),
});

const finishSchema = z.object({
  step: z.literal('finish'),
});

const requestSchema = z.discriminatedUnion('step', [
  businessSchema,
  skillsSchema,
  serviceAreaSchema,
  finishSchema,
]);

export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn('Onboarding save validation failed', {
        service: 'contractor-onboarding',
        userId: user.id,
        issues: parsed.error.issues,
      });
      throw new BadRequestError('Invalid input data');
    }
    const data = parsed.data;
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    if (data.step === 'business') {
      const { error } = await userDb
        .from('profiles')
        .update({
          company_name: data.business_name.trim() || null,
          phone: data.phone.trim() || null,
          years_experience: data.years_experience ?? null,
          bio: data.bio.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        logger.error('Failed to save business info', error, {
          service: 'contractor-onboarding',
          userId: user.id,
        });
        throw new InternalServerError('Failed to save business info');
      }
      return NextResponse.json({ success: true });
    }

    if (data.step === 'skills') {
      // contractor_skills is the canonical source (used by public
      // profile, search, matching agent). Replace strategy: delete
      // all + reinsert. Same pattern as /api/contractor/manage-skills.
      const { error: deleteErr } = await userDb
        .from('contractor_skills')
        .delete()
        .eq('contractor_id', user.id);
      if (deleteErr) {
        logger.error('Failed to clear existing skills', deleteErr, {
          service: 'contractor-onboarding',
          userId: user.id,
        });
        throw new InternalServerError('Failed to save skills');
      }

      if (data.skills.length > 0) {
        const { error: insertErr } = await userDb
          .from('contractor_skills')
          .insert(
            data.skills.map((skill_name) => ({
              contractor_id: user.id,
              skill_name,
            }))
          );
        if (insertErr) {
          logger.error('Failed to insert skills', insertErr, {
            service: 'contractor-onboarding',
            userId: user.id,
            skillCount: data.skills.length,
          });
          throw new InternalServerError('Failed to save skills');
        }
      }

      // Mirror license + insurance fields onto the profile for the
      // public-profile + verification surfaces.
      const profilePatch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (data.license_number.trim()) {
        profilePatch.license_number = data.license_number.trim();
      }
      if (data.insurance_provider.trim()) {
        profilePatch.insurance_provider = data.insurance_provider.trim();
      }
      if (Object.keys(profilePatch).length > 1) {
        await userDb.from('profiles').update(profilePatch).eq('id', user.id);
      }
      return NextResponse.json({ success: true });
    }

    if (data.step === 'serviceArea') {
      const { error } = await userDb
        .from('profiles')
        .update({
          service_postcode: data.service_postcode.trim() || null,
          service_radius_miles: data.service_radius_miles,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) {
        logger.error('Failed to save service area', error, {
          service: 'contractor-onboarding',
          userId: user.id,
        });
        throw new InternalServerError('Failed to save service area');
      }
      return NextResponse.json({ success: true });
    }

    if (data.step === 'finish') {
      const ok = await OnboardingService.markOnboardingComplete(user.id);
      if (!ok) {
        throw new InternalServerError(
          'Could not finalise onboarding — please try again or skip from the dashboard.'
        );
      }
      return NextResponse.json({ success: true });
    }

    throw new BadRequestError('Unknown step');
  }
);
