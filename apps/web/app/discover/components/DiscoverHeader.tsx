'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { theme } from '@/lib/theme';

interface DiscoverHeaderProps {
  userRole?: 'contractor' | 'homeowner' | 'admin';
  remainingCount: number;
}

/**
 * Header component for the Discover page
 * Shows logo, title, and remaining items count
 */
export function DiscoverHeader({ userRole, remainingCount }: DiscoverHeaderProps) {
  const isContractor = userRole === 'contractor';
  
  return (
    <>
      {/* Logo Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing[6],
        backgroundColor: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Image src="/assets/icon.png" alt="Mintenance Logo" width={40} height={40} className="w-10 h-10" />
          <span style={{
            marginLeft: theme.spacing[3],
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary
          }}>
            Mintenance
          </span>
        </Link>
      </div>

      {/* Title Header */}
      <div style={{ backgroundColor: theme.colors.primary, paddingTop: '60px', paddingBottom: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: '20px',
          paddingRight: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textInverse,
              margin: 0,
              marginBottom: '4px'
            }}>
              {isContractor ? 'Discover Jobs' : 'Discover Contractors'}
            </h1>
            <p style={{
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.textInverseMuted,
              fontWeight: theme.typography.fontWeight.medium,
              margin: 0
            }}>
              {isContractor
                ? 'Swipe to find your next project'
                : 'Swipe to find your perfect match'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textInverseMuted,
              margin: 0
            }}>
              {remainingCount} remaining
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

