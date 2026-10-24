import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { validateRequest } from '@/lib/validation/validator';
import { InternalServerError } from '@/lib/errors/api-error';

/** Saves setup preferences independently of platform introduction progress. */
const homeownerOnboardingCompleteSchema = z
  .object({
    propertyType: z
      .enum(['house', 'flat', 'terrace', 'bungalow', 'maisonette', 'other'])
      .optional()
      .nullable(),
    concernTags: z.array(z.string().max(60)).max(20).optional().nullable(),
  })
  .strict();

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const validation = await validateRequest(
      request,
      homeownerOnboardingCompleteSchema
    );
    if ('headers' in validation) {
      return validation;
    }

    const { propertyType, concernTags } = validation.data;

    const setupPatch: Record<string, unknown> = {
      homeowner_setup_completed: true,
    };
    if (propertyType !== undefined) {
      setupPatch.property_type = propertyType;
    }
    if (concernTags !== undefined) {
      setupPatch.concern_tags = concernTags ?? [];
    }

    // Merge into profiles.settings (JSONB) without clobbering unrelated
    // keys (notifications, theme, etc.).
    //
    // audit-76 follow-up Suggestion #9: add optimistic concurrency via
    // updated_at to close the read-then-write race. If another path
    // mutates settings between our SELECT and UPDATE, the UPDATE
    // filter on updated_at won't match (0 rows affected) and we retry
    // once with the freshly-read value. One retry is sufficient for a
    // 10 req/min rate-limited onboarding flow — a third concurrent
    // writer is effectively impossible. If both attempts lose the
    // race, we surface a 500 so the client retries explicitly.
    const tryMergeSettings = async (): Promise<{
      ok: boolean;
      retryable: boolean;
    }> => {
      const { data: existing, error: readErr } = await serverSupabase
        .from('profiles')
        .select('settings, updated_at')
        .eq('id', user.id)
        .single();

      if (readErr || !existing) {
        return { ok: false, retryable: false };
      }

      const currentSettings =
        (existing.settings as Record<string, unknown> | null | undefined) ?? {};
      const mergedSettings = { ...currentSettings, ...setupPatch };

      const { data: updated, error: settingsError } = await serverSupabase
        .from('profiles')
        .update({
          settings: mergedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .eq('updated_at', existing.updated_at as string)
        .select('id');

      if (settingsError) {
        logger.error(
          'Failed to persist homeowner setup answers',
          settingsError,
          { service: 'homeowner-onboarding', userId: user.id }
        );
        return { ok: false, retryable: false };
      }

      // 0 rows updated = another writer beat us between SELECT and
      // UPDATE; signal retryable so the caller can re-read.
      if (!updated || updated.length === 0) {
        return { ok: false, retryable: true };
      }
      return { ok: true, retryable: false };
    };

    let merge = await tryMergeSettings();
    if (!merge.ok && merge.retryable) {
      logger.info('Settings merge raced; retrying once', {
        service: 'homeowner-onboarding',
        userId: user.id,
      });
      merge = await tryMergeSettings();
    }
    if (!merge.ok) {
      throw new InternalServerError('Failed to save setup answers');
    }

    // Preferences are separate from learning the web/mobile controls.
    return NextResponse.json({ success: true, preferencesCompleted: true });
  }
);
