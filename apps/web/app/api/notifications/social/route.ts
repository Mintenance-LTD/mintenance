import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/notifications/social - retired endpoint.
 *
 * 2026-05-27 audit-87 P2: social posts / comments / followers were
 * removed in migration 007_remove_social_features.sql. The
 * post_liked / comment_added / comment_replied / new_follower
 * notification rows still exist in live Supabase as historical
 * residue (audit-80 dropped them from mobile unread counts and the
 * web feed at apps/web/lib/notifications/feed.ts already strips
 * them). The /contractor/social/* + /contractor/profile/:id deep
 * links those rows carry point at archived mobile/web surfaces.
 *
 * Rather than continue serving rows that route nowhere, this
 * endpoint now returns an empty list. The shape mirrors the prior
 * response so any in-flight callers (web SocialNotificationsBell or
 * a stale mobile build) degrade gracefully — an empty bell vs.
 * stale-rows-with-dead-links. Removing the endpoint entirely is the
 * follow-up once we confirm zero callers.
 */
export const GET = withApiHandler({ roles: ['contractor'] }, async () => {
  return NextResponse.json({
    notifications: [],
    unread_count: 0,
    total: 0,
    limit: 0,
    offset: 0,
    retired:
      'Social features were removed in migration 007. This endpoint is a no-op shim.',
  });
});
