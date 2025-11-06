'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/app/components/Logo';
import { useCSRF } from '@/lib/hooks/useCSRF';

export default function AdminRegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');

  const router = useRouter();
  const { csrfToken, loading: csrfLoading } = useCSRF();

  // Validate email domain on change
  useEffect(() => {
    if (email && !email.endsWith('@mintenance.co.uk')) {
      setEmailError('Admin accounts must use @mintenance.co.uk email address');
    } else {
      setEmailError('');
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!csrfToken) {
      setError('Security token not available. Please refresh the page.');
      return;
    }

    // Validate email domain
    if (!email.endsWith('@mintenance.co.uk')) {
      setError('Admin accounts must use @mintenance.co.uk email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          phone,
          role: 'admin', // Force admin role
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many registration attempts. Please try again later.');
        } else if (response.status === 400) {
          throw new Error(data.error || 'Invalid registration data. Please check your information.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Please refresh the page and try again.');
        } else {
          throw new Error('Registration failed. Please try again.');
        }
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
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
          <h2 className="text-4xl font-bold mb-6">Admin Registration</h2>
          <p className="text-xl text-gray-300 mb-4">
            Create an admin account to access the administrative dashboard.
          </p>
          <div className="bg-yellow-50 bg-opacity-10 border border-yellow-200 border-opacity-30 rounded-lg p-4 mt-4">
            <p className="text-sm text-yellow-100">
              <strong>Note:</strong> Only @mintenance.co.uk email addresses are allowed for admin accounts.
            </p>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          <p>© 2025 MINTENANCE LTD</p>
          <p>Company No. 16542104</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Admin Account</h2>
          <p className="text-gray-600 mb-8">
            Already have an account?{' '}
            <Link href="/admin/login" className="font-medium text-primary hover:text-primary-dark">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder:text-gray-400"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder:text-gray-400"
                  placeholder="Smith"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder:text-gray-400 ${
                  emailError ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="admin@mintenance.co.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-600">{emailError}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must be a @mintenance.co.uk email address
              </p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder:text-gray-400"
                placeholder="+44 7700 900000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder:text-gray-400"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-gray-700">Password must contain:</p>
                <ul className="text-xs text-gray-600 space-y-0.5 ml-4">
                  <li>• At least 8 characters</li>
                  <li>• One uppercase letter (A-Z)</li>
                  <li>• One lowercase letter (a-z)</li>
                  <li>• One number (0-9)</li>
                  <li>• One special character (!@#$%^&*)</li>
                </ul>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || csrfLoading || !!emailError}
                className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {csrfLoading ? 'Loading...' : loading ? 'Creating account...' : 'Create admin account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

