/**
 * /video-calls — fallback placeholder.
 *
 * Audit P1 (2026-04-23): the live-call surface is unbuilt. Sidebar
 * entries (homeowner + contractor) removed; in-thread "Start Now /
 * Voice / Video Call" buttons in the message client no longer push
 * here — they show a "coming soon" toast instead. Page kept so
 * direct URLs and the legacy VideoCallScheduler "view details"
 * prompt have a friendly landing.
 *
 * Note: `app/video-calls/components/VideoCallScheduler.tsx` is real
 * and embedded as a modal inside `messages/[jobId]/page.tsx` — that
 * flow still creates rows in `video_calls`. Only the standalone page
 * needs a real surface before the sidebar entry is restored.
 *
 * 2026-05-13 — migrated from a bespoke ~80-line layout to the shared
 * <ComingSoonPlaceholder>. Was the last of the four "Coming soon"
 * placeholders to use a hand-rolled card. Wrapped in
 * `HomeownerPageWrapper` so the homeowner sidebar is preserved
 * (the other three placeholders sit under the contractor shell).
 */

import type { Metadata } from 'next';
import React from 'react';
import { Video, MessageSquare, Calendar, Users } from 'lucide-react';
import { ComingSoonPlaceholder } from '@/components/ui/ComingSoonPlaceholder';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

export const metadata: Metadata = {
  title: 'Video Calls | Mintenance',
  description:
    'Connect with contractors via video calls for consultations and project discussions.',
  // noindex while the call surface is unbuilt — page exists only as a
  // direct-URL fallback. See sidebarNavConfig comment block for the
  // matching nav removal.
  robots: { index: false, follow: false },
};

export default function VideoCallsPage() {
  return (
    <HomeownerPageWrapper>
      <ComingSoonPlaceholder
        Icon={Video}
        iconColor='teal'
        title='Video Calls'
        description='Connect face-to-face with contractors for consultations, site assessments and project discussions — all without leaving the platform.'
        features={[
          { icon: MessageSquare, label: 'In-app calls' },
          { icon: Calendar, label: 'Pre-scheduled' },
          { icon: Users, label: 'Multi-party' },
        ]}
        backHref='/dashboard'
        backLabel='Back to Dashboard'
      />
    </HomeownerPageWrapper>
  );
}
