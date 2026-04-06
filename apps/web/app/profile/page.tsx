import { redirect } from 'next/navigation';

/**
 * /profile — Redirects to /settings (the canonical profile/settings page).
 *
 * This page previously had a duplicate profile editor with its own tabs
 * (Profile, Security, Notifications, Preferences). This caused stale-data
 * issues because edits in /profile weren't reflected in /settings and vice
 * versa. Consolidated to /settings as the single source of truth.
 */
export default function ProfilePage() {
  redirect('/settings');
}
