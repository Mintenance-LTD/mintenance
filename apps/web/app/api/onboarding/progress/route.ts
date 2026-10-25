import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  FEATURE_GUIDES,
  onboardingPersonas,
  ONBOARDING_VERSION,
} from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';

const progressSchema = z
  .object({
    journey: z.string().min(1).max(120),
    platform: z.enum(['web', 'mobile']),
    status: z.enum(['in_progress', 'completed', 'skipped']),
    step: z.number().int().min(0).max(100),
  })
  .strict();
export const GET = withApiHandler({}, async (_request, { user }) => {
  const { data, error } = await serverSupabase
    .from('onboarding_journeys')
    .select('journey, platform, status, step, updated_at')
    .eq('user_id', user.id)
    .eq('version', ONBOARDING_VERSION);
  if (error)
    throw new InternalServerError('Could not load your guide progress');
  return NextResponse.json({ progress: data ?? [] });
});
export const PUT = withApiHandler({}, async (request, { user }) => {
  const parsed = progressSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) throw new BadRequestError('Invalid guide progress');
  const value = parsed.data;
  const personas = onboardingPersonas(user.role);
  const allowed =
    (['homeowner', 'contractor'].includes(user.role) &&
      value.journey === `notice-early-access-${user.role}`) ||
    personas.some((persona) => value.journey === `intro-${persona}`) ||
    personas.some((persona) =>
      FEATURE_GUIDES.some(
        (guide) =>
          guide.personas.includes(persona) &&
          value.journey === `guide-${persona}-${guide.id}`
      )
    );
  if (!allowed)
    throw new BadRequestError('Guide is not available for this account');
  const { error } = await serverSupabase.from('onboarding_journeys').upsert(
    {
      ...value,
      user_id: user.id,
      version: ONBOARDING_VERSION,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,journey,platform,version' }
  );
  if (error)
    throw new InternalServerError('Could not save your guide progress');
  return NextResponse.json({ success: true });
});
