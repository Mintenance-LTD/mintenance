'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { theme } from '@/lib/theme';
import { useCSRF } from '@/lib/hooks/useCSRF';

interface VerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  canPostJobs: boolean;
  missingRequirements: string[];
}

interface VerificationBannerProps {
  verificationStatus: VerificationStatus;
}

/**
 * Banner component displayed when user needs to verify account before posting jobs
 */
export function VerificationBanner({ verificationStatus }: VerificationBannerProps) {
  const { csrfToken } = useCSRF();
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailResendMessage, setEmailResendMessage] = useState<{
    type: 'success' | 'error';
    message: string;
    inbucketUrl?: string;
  } | null>(null);

  const handleResendEmail = async () => {
    if (!csrfToken) {
      setEmailResendMessage({
        type: 'error',
        message: 'Security token not available. Please refresh the page.',
      });
      return;
    }

    setResendingEmail(true);
    setEmailResendMessage(null);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setEmailResendMessage({
          type: 'error',
          message: data.error || 'Failed to send verification email. Please try again.',
        });
      } else {
        setEmailResendMessage({
          type: 'success',
          message: data.message || 'Verification email sent! Please check your inbox.',
          inbucketUrl: data.inbucketUrl,
        });
      }
    } catch (error) {
      setEmailResendMessage({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FEF3C7',
        border: '1px solid #F59E0B',
        borderRadius: '12px',
        padding: theme.spacing[6],
        marginBottom: theme.spacing[6],
      }}
    >
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: theme.spacing[4] }}>
        Verification Required
      </h2>
      <p style={{ marginBottom: theme.spacing[4] }}>
        Please verify your account before posting jobs:
      </p>
      <ul style={{ marginBottom: theme.spacing[4], paddingLeft: theme.spacing[6] }}>
        {verificationStatus.missingRequirements.map((req, i) => (
          <li key={i} style={{ marginBottom: theme.spacing[2] }}>
            {req}
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
        {!verificationStatus.emailVerified && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
            <Button
              variant="primary"
              onClick={handleResendEmail}
              disabled={resendingEmail}
              style={{ width: 'fit-content' }}
            >
              {resendingEmail ? 'Sending...' : 'Resend Email Verification'}
            </Button>
            {emailResendMessage && (
              <div
                style={{
                  padding: theme.spacing[2],
                  borderRadius: '8px',
                  backgroundColor:
                    emailResendMessage.type === 'success' ? '#D1FAE5' : '#FEE2E2',
                  color: emailResendMessage.type === 'success' ? '#065F46' : '#991B1B',
                  fontSize: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: emailResendMessage.inbucketUrl ? theme.spacing[1] : 0,
                }}
              >
                <div>{emailResendMessage.message}</div>
                {emailResendMessage.inbucketUrl && (
                  <a
                    href={emailResendMessage.inbucketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#3B82F6',
                      textDecoration: 'underline',
                      fontWeight: 500,
                    }}
                  >
                    Open Inbucket Email Viewer →
                  </a>
                )}
              </div>
            )}
          </div>
        )}
        {!verificationStatus.phoneVerified && (
          <Link
            href="/verify-phone"
            style={{
              display: 'inline-block',
              padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
              backgroundColor: '#3B82F6',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              width: 'fit-content',
            }}
          >
            Verify Phone Number
          </Link>
        )}
      </div>
    </div>
  );
}

