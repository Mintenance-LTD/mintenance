'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import Logo from '../../components/Logo';
import { theme } from '@/lib/theme';

interface PublicLayoutProps {
  children: ReactNode;
}

/**
 * Public layout for pages that don't require authentication
 * Used for contractor profiles and other public-facing pages
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.backgroundSecondary }}>
      {/* Simple Header */}
      <header style={{
        backgroundColor: theme.colors.white,
        borderBottom: `1px solid ${theme.colors.border}`,
        padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            textDecoration: 'none',
            color: theme.colors.textPrimary,
          }}>
            <Logo />
            <span style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
            }}>
              Mintenance
            </span>
          </Link>
          <div style={{ display: 'flex', gap: theme.spacing[4], alignItems: 'center' }}>
            <Link href="/contractors" style={{
              textDecoration: 'none',
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.medium,
            }}>
              Find Contractors
            </Link>
            <Link href="/login" style={{
              textDecoration: 'none',
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.medium,
            }}>
              Log In
            </Link>
            <Link href="/register" style={{
              textDecoration: 'none',
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.lg,
              backgroundColor: theme.colors.primary,
              color: 'white',
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
            }}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}

