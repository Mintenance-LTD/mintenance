'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { MintEditorialShell } from './mint-editorial/MintEditorialShell';

interface HomeownerPageWrapperProps {
  children: ReactNode;
  className?: string;
  /**
   * Pages whose own JSX already renders an internal scroll/back-button
   * pattern that fights the Mint Editorial shell's padding can opt
   * out per-page. The legacy branch is unaffected either way.
   */
  disableMintEditorialShell?: boolean;
}

/**
 * Universal wrapper for homeowner pages.
 *
 * Two behaviours:
 *
 *   1. Legacy / default theme — renders a plain padded <div>, exactly
 *      as it has for the past year. Pages keep whatever chrome they
 *      already declare internally.
 *
 *   2. Mint Editorial — wraps `children` in <MintEditorialShell>, which
 *      provides the sidebar + topbar + persistent Mint AI dock. This
 *      is how every homeowner page picks up the new chrome once a
 *      user opts in via Settings → Appearance, without each page
 *      having to import the shell directly.
 *
 * The theme detection reads `<html data-theme>` (set server-side by
 * app/layout.tsx from the `mintenance-theme` cookie). The initial
 * render returns the legacy branch so SSR + first-pass CSR match
 * exactly; a one-tick effect upgrades to the shell on the client when
 * the theme is active. Users who haven't opted in see no flash and no
 * behaviour change.
 */
export function HomeownerPageWrapper({
  children,
  className = '',
  disableMintEditorialShell = false,
}: HomeownerPageWrapperProps) {
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  const { user } = useCurrentUser();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (isMintEditorial && !disableMintEditorialShell) {
    const fullName =
      user?.first_name || user?.last_name
        ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
        : (user?.email?.split('@')[0] ?? 'Homeowner');
    return (
      <MintEditorialShell
        homeownerName={fullName}
        email={user?.email ?? undefined}
        role={user?.role}
        postcode={user?.postcode}
        profileImageUrl={user?.profile_image_url ?? null}
      >
        <div className={className}>{children}</div>
      </MintEditorialShell>
    );
  }

  return <div className={`w-full px-8 ${className}`}>{children}</div>;
}
