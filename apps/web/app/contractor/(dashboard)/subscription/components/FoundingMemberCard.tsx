'use client';

/**
 * 2026-05-28 audit-89 P1: founding-member card for contractors with an
 * early_access_grants row. Replaces the generic trial countdown + plan
 * picker because grant holders don't have a trial and don't need to
 * subscribe — the backend (FeeCalculationService.resolveContractorTier)
 * already gives them the top-tier feature set and the 5% per-job
 * platform fee. The previous page UX showed them Basic/Business/
 * Professional cards with "Subscribe Now" CTAs that would have created
 * Stripe rows they don't owe.
 *
 * Extracted into its own file so SubscriptionClient.tsx stays under
 * the 500-line MDC cap.
 */

import React from 'react';
import { theme } from '@/lib/theme';
import { Sparkles } from 'lucide-react';

export function FoundingMemberCard() {
  return (
    <div
      style={{
        // theme.colors.success + '20' = the same tinted-green panel
        // pattern used elsewhere on this page. Keeps the founding-
        // member card visually consistent without adding new design
        // tokens or hex literals.
        backgroundColor: theme.colors.success + '20',
        border: `1px solid ${theme.colors.success}`,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing[6],
        marginBottom: theme.spacing[6],
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: theme.spacing[3],
          alignItems: 'flex-start',
        }}
      >
        <Sparkles
          className='h-5 w-5'
          style={{ color: theme.colors.success, flexShrink: 0 }}
        />
        <div style={{ flex: 1 }}>
          <h2
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}
          >
            Founding member — early access
          </h2>
          <p
            style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[3],
              lineHeight: 1.5,
            }}
          >
            You&apos;re part of the early-access cohort. No monthly subscription
            fee — we only take a small platform fee from each completed job.
            Your account permanently includes the top-tier feature set.
          </p>
          <ul
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              margin: 0,
              paddingLeft: theme.spacing[5],
              lineHeight: 1.7,
            }}
          >
            <li>
              <strong>5% platform fee</strong> per completed job (lowest rate on
              the platform)
            </li>
            <li>Unlimited jobs &amp; unlimited active jobs</li>
            <li>Priority support &amp; advanced analytics</li>
            <li>No monthly subscription — ever</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
