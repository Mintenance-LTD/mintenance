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
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
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
      <div style={{ 
        background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryLight} 100%)`,
        paddingTop: '40px',
        paddingBottom: '24px' 
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
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
              color: 'white',
              margin: 0,
              marginBottom: '8px'
            }}>
              {isContractor ? 'Discover Jobs' : 'Discover Contractors'}
            </h1>
            <p style={{
              fontSize: theme.typography.fontSize.lg,
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: theme.typography.fontWeight.normal,
              margin: 0
            }}>
              {isContractor
                ? 'Find your next project opportunity'
                : 'Swipe to find trusted professionals'}
            </p>
          </div>
          <div style={{ 
            textAlign: 'right',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            padding: '12px 20px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: 'white',
              margin: 0
            }}>
              {remainingCount}
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: 'rgba(255, 255, 255, 0.9)',
              margin: 0
            }}>
              remaining
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

