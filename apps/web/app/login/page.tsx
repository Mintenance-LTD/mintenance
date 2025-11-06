'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '../components/Logo';
import { useCSRF } from '@/lib/hooks/useCSRF';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { csrfToken, loading: csrfLoading } = useCSRF();

  // Password reveal on focus
  const handlePasswordFocus = () => {
    setShowPassword(true);
  };

  const handlePasswordBlur = () => {
    // Hide password after 2 seconds
    setTimeout(() => {
      setShowPassword(false);
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!csrfToken) {
      setError('Security token not available. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Provide more specific error messages with actionable suggestions
        if (response.status === 429) {
          throw new Error('Too many login attempts. Please wait a few minutes and try again.');
        } else if (response.status === 401) {
          // Check if the error provides more detail
          const errorMessage = data.error || data.message || '';
          if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('not found')) {
            throw new Error('No account found with this email address. Please check your email or sign up for a new account.');
          } else if (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('invalid')) {
            throw new Error('Incorrect password. Please check your password or use "Forgot password" to reset it.');
          } else {
            throw new Error('Invalid email or password. Please check your credentials and try again.');
          }
        } else if (response.status === 403) {
          throw new Error('Access denied. Please refresh the page and try again.');
        } else if (response.status === 400) {
          throw new Error(data.error || 'Invalid request. Please check your email and password format.');
        } else {
          throw new Error(data.error || 'Login failed. Please try again or contact support if the problem persists.');
        }
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex w-1/2 bg-primary text-white p-12 flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center space-x-2 mb-12">
            <Logo />
            <h1 className="text-3xl font-bold">Mintenance</h1>
          </Link>
          <h2 className="text-4xl font-bold mb-6">Welcome Back!</h2>
          <p className="text-xl text-gray-300">Sign in to manage your home projects and connect with trusted tradespeople.</p>
        </div>
        <div className="text-sm text-gray-400">
          <p>© 2025 MINTENANCE LTD</p>
          <p>Company No. 16542104</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Logo />
              <h1 className="text-2xl font-bold text-primary">Mintenance</h1>
            </Link>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign in to your account</h2>
          <p className="text-gray-600 mb-8">
            Or <Link href="/register" className="font-medium text-primary hover:text-primary-light">create a new account</Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder:text-gray-400"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder:text-gray-400"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
              />
              {showPassword && (
                <p className="mt-1 text-xs text-gray-500">Password visible for 2 seconds to verify</p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium">{error}</p>
                    {(error.toLowerCase().includes('password') || error.toLowerCase().includes('incorrect')) && (
                      <p className="mt-2 text-xs text-red-600">
                        <Link href="/forgot-password" className="underline font-medium hover:text-red-800">
                          Reset your password
                        </Link>
                        {' '}if you've forgotten it.
                      </p>
                    )}
                    {error.toLowerCase().includes('email') && !error.toLowerCase().includes('password') && (
                      <p className="mt-2 text-xs text-red-600">
                        <Link href="/register" className="underline font-medium hover:text-red-800">
                          Create an account
                        </Link>
                        {' '}if you don't have one yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!csrfToken && csrfLoading)}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="flex items-center justify-between pt-2">
              <Link 
                href="/forgot-password" 
                className="text-sm font-medium text-primary hover:text-primary-light hover:underline"
              >
                Forgot your password?
              </Link>
              {error && error.toLowerCase().includes('password') && (
                <Link 
                  href="/forgot-password" 
                  className="text-sm font-semibold text-primary hover:text-primary-light underline"
                >
                  Reset Password →
                </Link>
              )}
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Don't have an account? <Link href="/register" className="font-medium text-primary hover:text-primary-light">Sign up for free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
