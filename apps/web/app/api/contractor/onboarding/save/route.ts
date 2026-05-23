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

      // 2026-05-13 schema audit: only `license_number` lives on
      // `profiles`. Insurance is normalised into the dedicated
      // `contractor_insurance` table (provider/policy_number/status),
      // so we upsert that row separately rather than trying to write
      // a non-existent `profiles.insurance_provider` column (which
      // would 42703 and silently fail the whole skills step).
      const profilePatch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (data.license_number.trim()) {
        profilePatch.license_number = data.license_number.trim();
      }
      if (Object.keys(profilePatch).length > 1) {
        await userDb.from('profiles').update(profilePatch).eq('id', user.id);
      }

      if (data.insurance_provider.trim()) {
        // contractor_insurance has NO unique constraint on contractor_id
        // (verified live 2026-05-13: only contractor_insurance_pkey on
        // `id`), so we cannot use `.upsert(..., { onConflict })` —
        // that would 42P10 immediately. Manual check-then-update or
        // insert keeps onboarding non-fatal.
        const insuranceValues = {
          provider: data.insurance_provider.trim(),
          type: 'general_liability',
          status: 'active',
          updated_at: new Date().toISOString(),
        };
        const { data: existing } = await userDb
          .from('contractor_insurance')
          .select('id')
          .eq('contractor_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { error: insuranceErr } = existing
          ? await userDb
              .from('contractor_insurance')
              .update(insuranceValues)
              .eq('id', existing.id)
          : await userDb.from('contractor_insurance').insert({
              contractor_id: user.id,
              ...insuranceValues,
            });
        if (insuranceErr) {
          // Non-fatal — skills step itself succeeded. Log for retry
          // via a later edit on /contractor/profile.
          logger.warn('Failed to write contractor insurance', {
            service: 'contractor-onboarding',
            userId: user.id,
            errorMessage: insuranceErr.message,
            errorCode: insuranceErr.code,
          });
        }
      }
      return NextResponse.json({ success: true });
    }

    if (data.step === 'serviceArea') {
      // 2026-05-23 audit P0: previously this wrote `service_postcode`
      // and `service_radius_miles` to public.profiles. Neither column
      // exists on the live table (only service_areas.service_radius
      // does), so every contractor's onboarding step-3 save 500'd.
      //
      // Canonical home for service-area data is the service_areas
      // table — one row per area, keyed by contractor_id. Onboarding
      // sets up the contractor's *primary* area; later they can add
      // more from /contractor/service-areas. Upsert by (contractor_id,
      // is_primary_area) so re-saving the step doesn't create dupes.
      const postcode = data.service_postcode.trim();
      const radiusKm = Math.round(data.service_radius_miles * 1.60934);

      // Find existing primary area; update it, else insert.
      const { data: existing } = await userDb
        .from('service_areas')
        .select('id')
        .eq('contractor_id', user.id)
        .eq('is_primary_area', true)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await userDb
          .from('service_areas')
          .update({
            postal_codes: postcode ? [postcode] : [],
            service_radius: radiusKm,
            radius_km: radiusKm,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) {
          logger.error('Failed to update primary service area', error, {
            service: 'contractor-onboarding',
            userId: user.id,
          });
          throw new InternalServerError('Failed to save service area');
        }
      } else {
        const { error } = await userDb.from('service_areas').insert({
          contractor_id: user.id,
          area_name: postcode || 'Primary service area',
          postal_codes: postcode ? [postcode] : [],
          service_radius: radiusKm,
          radius_km: radiusKm,
          is_primary_area: true,
          is_active: true,
        });
        if (error) {
          logger.error('Failed to insert primary service area', error, {
            service: 'contractor-onboarding',
            userId: user.id,
          });
          throw new InternalServerError('Failed to save service area');
        }
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
