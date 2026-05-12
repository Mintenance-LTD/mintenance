'use client';

/**
 * Bottom-of-sidebar user card + popover menu for the Mint Editorial
 * chrome.
 *
 * Two bugs this fixes (2026-05-12 user report):
 *
 *   1. No logout button anywhere in the Mint Editorial chrome. The
 *      legacy ProfessionalHomeownerLayout had a user dropdown with
 *      "Sign out"; the new chrome was non-interactive. Users could
 *      not log out without clearing cookies manually.
 *
 *   2. Profile picture never rendered. The card always showed
 *      initials even when `profiles.profile_image_url` was set in
 *      the DB. Plumbing was missing from HomeownerPageWrapper →
 *      Shell → Sidebar.
 *
 * The card is a `<button>` that toggles a small popover above it
 * with Profile / Settings / Sign out items. Click-outside dismisses.
 * Sign out POSTs `/api/auth/logout` with a fresh CSRF header, then
 * navigates to `/login` — same flow the legacy layout uses.
 */

import React, { useEffect, useRef, useState } from 'react';
/* eslint-disable @next/next/no-img-element */
// Profile pictures live in the public `avatars` Supabase bucket; the
// host is allowed in next.config.js but we use plain <img> for
// consistency with the rest of the homeowner pages (which dodge the
// remotePatterns allow-list because Job-storage signed URLs rotate).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';
import { initials } from './dashboardHelpers';

interface Props {
  homeownerName: string;
  subtitle: string;
  profileImageUrl?: string | null;
}

export function MintEditorialSidebarUserMenu({
  homeownerName,
  subtitle,
  profileImageUrl,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside + Escape dismiss the popover.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      // /api/auth/logout requires CSRF (`csrf: true` in route options).
      // Use the canonical helper that fetches a fresh token and
      // returns the right header pair.
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: await getCsrfHeaders(),
      });
      if (!res.ok && res.status !== 401) {
        // 401 just means we were already logged out by the time the
        // POST arrived — still navigate to /login below.
        throw new Error(`Logout failed (${res.status})`);
      }
      router.push('/login');
    } catch (error) {
      logger.error('Logout error', error, { service: 'ui' });
      toast.error('Could not sign out. Please try again.');
      setLoggingOut(false);
    }
  };

  const renderAvatar = () => {
    if (profileImageUrl) {
      return (
        <span className='me-sidebar-user-avatar'>
          <img src={profileImageUrl} alt={homeownerName} />
        </span>
      );
    }
    return (
      <span className='me-sidebar-user-avatar'>{initials(homeownerName)}</span>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type='button'
        className='me-sidebar-user-trigger'
        aria-haspopup='menu'
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {renderAvatar()}
        <div className='col' style={{ gap: 0, minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {homeownerName}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--me-ink-3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </div>
        </div>
      </button>

      {open ? (
        <div role='menu' className='me-sidebar-user-menu'>
          {/* /profile is just a redirect to /settings (see
              apps/web/app/profile/page.tsx) — keeping both menu items
              would send users through a 301-bounce to the same surface.
              One canonical entry. */}
          <Link
            href='/settings'
            className='item'
            onClick={() => setOpen(false)}
            role='menuitem'
          >
            <Settings size={14} strokeWidth={1.75} />
            Profile &amp; settings
          </Link>
          <div className='divider' />
          <button
            type='button'
            className='item danger'
            onClick={handleLogout}
            disabled={loggingOut}
            role='menuitem'
          >
            <LogOut size={14} strokeWidth={1.75} />
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
