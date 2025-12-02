'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { toast } from 'react-hot-toast';
import { logger } from '@mintenance/shared';

export default function MFAVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preMfaToken = searchParams.get('token');

  const [code, setCode] = useState('');
  const [method, setMethod] = useState<'totp' | 'backup_code' | 'sms' | 'email'>('totp');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Get CSRF token
  useEffect(() => {
    async function fetchCSRF() {
      try {
        const response = await fetch('/api/csrf');
        const data = await response.json();
        setCsrfToken(data.csrfToken);
      } catch (error) {
        logger.error('Failed to fetch CSRF token', error);
      }
    }
    fetchCSRF();
  }, []);

  // Redirect if no pre-MFA token
  useEffect(() => {
    if (!preMfaToken) {
      router.push('/login');
    }
  }, [preMfaToken, router]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [method]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || code.length < 6) {
      toast.error('Please enter a valid verification code');
      return;
    }

    if (!preMfaToken) {
      toast.error('Session expired. Please login again.');
      router.push('/login');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          preMfaToken,
          code,
          method,
          rememberDevice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      toast.success('Login successful!');

      // Warn if backup codes are running low
      if (data.requiresNewBackupCodes) {
        toast.success('Warning: You have used a backup code. Generate new codes in settings.', {
          duration: 5000,
        });
      }

      // Redirect based on role
      const redirectUrl = searchParams.get('redirect') ||
        (data.user.role === 'contractor' ? '/contractor/dashboard-enhanced' : '/dashboard');

      router.push(redirectUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      toast.error(message);
      logger.error('MFA verification error', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (newMethod: typeof method) => {
    setMethod(newMethod);
    setCode('');
  };

  if (!preMfaToken) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 to-navy-800 px-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Two-Factor Authentication
          </h1>
          <p className="text-sm text-gray-600">
            Enter your verification code to complete login
          </p>
        </div>

        {/* Method selector */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => handleMethodChange('totp')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              method === 'totp'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Authenticator App
          </button>
          <button
            onClick={() => handleMethodChange('backup_code')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              method === 'backup_code'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Backup Code
          </button>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          {/* Code input */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              {method === 'totp' ? '6-digit code' : 'Backup code'}
            </label>
            <Input
              ref={inputRef}
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              placeholder={method === 'totp' ? '000000' : 'XXXXXXXX'}
              maxLength={method === 'totp' ? 6 : 8}
              className="text-center text-xl tracking-widest font-mono"
              disabled={loading}
              autoComplete="off"
            />
            {method === 'totp' && (
              <p className="mt-2 text-xs text-gray-500">
                Open your authenticator app and enter the 6-digit code
              </p>
            )}
            {method === 'backup_code' && (
              <p className="mt-2 text-xs text-gray-500">
                Enter one of your backup codes (use each code only once)
              </p>
            )}
          </div>

          {/* Remember device checkbox */}
          <div className="flex items-center">
            <input
              id="rememberDevice"
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              disabled={loading}
            />
            <label htmlFor="rememberDevice" className="ml-2 block text-sm text-gray-700">
              Trust this device for 30 days
            </label>
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !code || code.length < 6}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
        </form>

        {/* Help text */}
        <div className="text-center space-y-2 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Lost access to your authenticator app?
          </p>
          <button
            onClick={() => handleMethodChange('backup_code')}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Use a backup code instead
          </button>
        </div>

        {/* Back to login */}
        <div className="text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            Back to login
          </button>
        </div>
      </Card>
    </div>
  );
}
