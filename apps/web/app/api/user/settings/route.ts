/**
 * GET/PATCH /api/user/settings
 *
 * Read/write the authenticated user's `profiles.settings` JSONB.
 * Whitelist-validated: only keys defined in `SettingsSchema` are
 * persisted, everything else is dropped.
 *
 * R3 #5a of docs/RETENTION_ROADMAP_2026.md (Silver mode toggle lives
 * here). Future sprints layer more keys on the same schema.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

const SettingsSchema = z
  .object({
    silverMode: z.boolean().optional(),
    learning_completed: z.array(z.string().max(64)).max(32).optional(),
    protected_payment_explainer_seen: z.boolean().optional(),
  })
  .strict();

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (_req, { user }) => {
    const { data, error } = await serverSupabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      logger.warn('Failed to load user settings', {
        service: 'api/user/settings',
        userId: user.id,
        error: error.message,
      });
      return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
    }

    return NextResponse.json(data?.settings ?? {});
  }
);

export const PATCH = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const raw = await request.json().catch(() => null);
    const parsed = SettingsSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid settings', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Load existing jsonb, merge in the patch (shallow merge — arrays
    // are replaced wholesale, booleans overwrite).
    const { data: current } = await serverSupabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .maybeSingle();

    const merged = {
      ...((current?.settings as Record<string, unknown>) || {}),
      ...parsed.data,
    };

    const { error } = await serverSupabase
      .from('profiles')
      .update({ settings: merged, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      logger.error('Failed to save user settings', {
        service: 'api/user/settings',
        userId: user.id,
        error: error.message,
      });
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json(merged);
  }
);
