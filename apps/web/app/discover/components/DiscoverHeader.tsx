'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { theme } from '@/lib/theme';

interface DiscoverHeaderProps {
  userRole?: 'contractor' | 'homeowner' | 'admin';
  remainingCount: number;
  progressPercentage?: number;
  matchCount?: number;
}

/**
 * Header component for the Discover page
 * Shows logo, title, and remaining items count
 */
export function DiscoverHeader({ userRole, remainingCount, progressPercentage = 0, matchCount = 0 }: DiscoverHeaderProps) {
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
          paddingRight: '20px',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
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
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Match Count Badge */}
            {matchCount > 0 && (
              <div style={{ 
                textAlign: 'center',
                backgroundColor: theme.colors.success,
                padding: '12px 20px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}>
                <div style={{
                  fontSize: theme.typography.fontSize['2xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  color: 'white',
                  margin: 0
                }}>
                  {matchCount}
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: 'rgba(255, 255, 255, 0.9)',
                  margin: 0
                }}>
                  {matchCount === 1 ? 'match' : 'matches'}
                </div>
              </div>
            )}
            
            {/* Remaining Count */}
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
              {progressPercentage > 0 && (
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginTop: '4px'
                }}>
                  {progressPercentage}% complete
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

