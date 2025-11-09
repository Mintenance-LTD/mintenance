'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HomeownerLayoutShell } from '@/app/dashboard/components/HomeownerLayoutShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { theme } from '@/lib/theme';
import { AlertCircle, CheckCircle, Loader2, Shield } from 'lucide-react';
import { useCSRF } from '@/lib/hooks/useCSRF';

interface VerifyPhoneClientProps {
  userId: string;
  currentPhone?: string;
  userName?: string;
  userEmail?: string;
}

export function VerifyPhoneClient({ userId, currentPhone, userName, userEmail }: VerifyPhoneClientProps) {
  const router = useRouter();
  const { csrfToken } = useCSRF();
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phoneNumber, setPhoneNumber] = useState(currentPhone || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, add country code (default to +44 for UK)
    if (!cleaned.startsWith('+')) {
      return cleaned ? `+44${cleaned}` : '';
    }
    
    return cleaned;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (!csrfToken) {
      setError('Security token not available. Please refresh the page.');
      setIsLoading(false);
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!formattedPhone || formattedPhone.length < 10) {
      setError('Please enter a valid phone number');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'send',
          phoneNumber: formattedPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send verification code');
        setIsLoading(false);
        return;
      }

      setSuccess('Verification code sent successfully!');
      setCodeSent(true);
      setStep('verify');
      setPhoneNumber(formattedPhone);
      setCountdown(300); // 5 minutes in seconds
      
      // Start countdown timer
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setIsLoading(false);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (!csrfToken) {
      setError('Security token not available. Please refresh the page.');
      setIsLoading(false);
      return;
    }

    if (verificationCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'verify',
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid verification code');
        setIsLoading(false);
        return;
      }

      setSuccess('Phone number verified successfully!');
      
      // Redirect to jobs/create after 1.5 seconds
      setTimeout(() => {
        router.push('/jobs/create');
      }, 1500);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (!csrfToken) {
      setError('Security token not available. Please refresh the page.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'resend',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to resend verification code');
        setIsLoading(false);
        return;
      }

      setSuccess('Verification code resent successfully!');
      setCountdown(300); // Reset countdown
      setIsLoading(false);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <HomeownerLayoutShell 
      currentPath="/verify-phone"
      userName={userName}
      userEmail={userEmail}
    >
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: theme.spacing[6],
      }}>
        <div style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          border: `1px solid ${theme.colors.border}`,
          padding: theme.spacing[8],
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            marginBottom: theme.spacing[6],
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: theme.borderRadius.full,
              backgroundColor: '#DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Shield className="h-6 w-6" style={{ color: '#1E40AF' }} />
            </div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}>
                Verify Your Phone Number
              </h1>
              <p style={{
                margin: 0,
                marginTop: theme.spacing[1],
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
              }}>
                Required to post jobs on Mintenance
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" style={{ marginBottom: theme.spacing[4] }}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert style={{ marginBottom: theme.spacing[4], backgroundColor: '#D1FAE5', borderColor: '#10B981' }}>
              <CheckCircle className="h-4 w-4" style={{ color: '#10B981' }} />
              <AlertTitle style={{ color: '#065F46' }}>Success</AlertTitle>
              <AlertDescription style={{ color: '#047857' }}>{success}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Enter Phone Number */}
          {step === 'phone' && (
            <form onSubmit={handleSendCode}>
              <div style={{ marginBottom: theme.spacing[4] }}>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  marginBottom: theme.spacing[2],
                }}>
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+44 7700 900000"
                  required
                  disabled={isLoading}
                  style={{ width: '100%' }}
                />
                <p style={{
                  marginTop: theme.spacing[2],
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                }}>
                  Include country code (e.g., +44 for UK, +1 for US)
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || !phoneNumber}
                style={{ width: '100%' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Verify Code */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyCode}>
              <div style={{ marginBottom: theme.spacing[4] }}>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  marginBottom: theme.spacing[2],
                }}>
                  Verification Code
                </label>
                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                  }}
                  placeholder="000000"
                  required
                  disabled={isLoading}
                  style={{ 
                    width: '100%',
                    textAlign: 'center',
                    fontSize: theme.typography.fontSize['2xl'],
                    letterSpacing: theme.spacing[2],
                  }}
                />
                <p style={{
                  marginTop: theme.spacing[2],
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}>
                  Enter the 6-digit code sent to {phoneNumber}
                </p>
                {countdown > 0 && (
                  <p style={{
                    marginTop: theme.spacing[1],
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                  }}>
                    Code expires in {formatCountdown(countdown)}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading || verificationCode.length !== 6}
                  style={{ width: '100%' }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Phone Number'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendCode}
                  disabled={isLoading || countdown > 0}
                  style={{ width: '100%' }}
                >
                  {countdown > 0 ? `Resend Code (${formatCountdown(countdown)})` : 'Resend Code'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep('phone');
                    setVerificationCode('');
                    setCodeSent(false);
                    setCountdown(0);
                  }}
                  disabled={isLoading}
                  style={{ width: '100%' }}
                >
                  Change Phone Number
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </HomeownerLayoutShell>
  );
}

