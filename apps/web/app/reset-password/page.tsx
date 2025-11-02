'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '../components/Logo';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get access token from URL hash (Supabase sends it in the hash)
    // Format: #access_token=xxx&type=recovery&expires_in=3600&refresh_token=xxx
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      const type = params.get('type');

      // Verify this is a password recovery token
      if (!token || type !== 'recovery') {
        setStatus('error');
        setErrorMessage('Invalid or expired reset link. Please request a new one.');
      } else {
        setAccessToken(token);
      }
    } else {
      // Also check query parameters as fallback
      const token = searchParams.get('token') || searchParams.get('access_token');
      if (token) {
        setAccessToken(token);
      } else {
        setStatus('error');
        setErrorMessage('No reset token found. Please check your email for the reset link.');
      }
    }
  }, [searchParams]);

  const validatePassword = () => {
    // Clear any previous errors first
    setErrorMessage('');
    
    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return false;
    }
    
    // Check password complexity - allow all special characters (not just @$!%*?&)
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password); // Any non-alphanumeric character
    
    // Debug logging (remove in production)
    console.log('Password validation:', {
      password,
      length: password.length,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecialChar,
      allValid: hasUppercase && hasLowercase && hasNumber && hasSpecialChar
    });
    
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      const missing = [];
      if (!hasUppercase) missing.push('uppercase letter');
      if (!hasLowercase) missing.push('lowercase letter');
      if (!hasNumber) missing.push('number');
      if (!hasSpecialChar) missing.push('special character');
      
      setErrorMessage(`Password must contain at least one ${missing.join(', ')}`);
      return false;
    }
    
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setStatus('success');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Failed to reset password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-light flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center mb-6">
            <Logo />
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Reset Your Password</h1>
          <p className="text-gray-300">
            Enter your new password below
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {status === 'success' ? (
            // Success Message
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-primary mb-3">Password Reset Successful!</h2>
              <p className="text-gray-600 mb-6">
                Your password has been reset. Redirecting you to login...
              </p>
            </div>
          ) : (
            // Reset Form
            <>
              {status === 'error' && errorMessage && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-start">
                  <svg className="w-5 h-5 mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-primary mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      // Clear error when user starts typing
                      if (status === 'error') {
                        setErrorMessage('');
                        setStatus('idle');
                      }
                    }}
                    onBlur={() => {
                      // Only validate silently on blur - don't show errors until submit
                      // This allows users to type without seeing errors immediately
                    }}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                    placeholder="Enter new password"
                    disabled={status === 'submitting' || !accessToken}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Must contain: 8+ characters, uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-primary mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                    placeholder="Confirm new password"
                    disabled={status === 'submitting' || !accessToken}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting' || !accessToken}
                  className="w-full bg-secondary text-white px-6 py-3 rounded-lg font-semibold hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'submitting' ? 'Resetting...' : 'Reset Password'}
                </button>

                <div className="text-center">
                  <Link href="/login" className="text-sm text-gray-600 hover:text-secondary transition-colors">
                    ← Back to Login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-secondary mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Security Tip</h3>
              <p className="text-xs text-gray-300">
                Choose a strong password with at least 8 characters, including numbers and special characters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
