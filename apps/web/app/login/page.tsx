'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '../components/Logo';
import { SessionManager } from '@/lib/session-manager';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      // Initialize session with remember me preference
      const sessionManager = SessionManager.getInstance();
      sessionManager.setSession(rememberMe);

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex w-1/2 bg-[#0F172A] text-white p-12 flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center space-x-2 mb-12">
            <Logo className="w-10 h-10" />
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
              <Logo className="w-10 h-10" />
              <h1 className="text-2xl font-bold text-[#0F172A]">Mintenance</h1>
            </Link>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign in to your account</h2>
          <p className="text-gray-600 mb-8">
            Or <Link href="/register" className="font-medium text-[#0F172A] hover:text-[#1E293B]">create a new account</Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-[#0F172A] focus:ring-[#0F172A] border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F172A] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="text-center">
              <Link href="/forgot-password" className="text-sm font-medium text-[#0F172A] hover:text-[#1E293B]">Forgot your password?</Link>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Don't have an account? <Link href="/register" className="font-medium text-[#0F172A] hover:text-[#1E293B]">Sign up for free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
