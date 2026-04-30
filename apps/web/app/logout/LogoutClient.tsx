'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, ArrowLeft, Loader2 } from 'lucide-react';
import { logger } from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';

/**
 * Client component that owns the logout interaction. The user must press
 * the button — visiting the parent page does nothing on its own. This
 * matches the existing dashboard layout logout flow (POST + CSRF).
 */
export default function LogoutClient() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setError(null);

    try {
      const headers = await getCsrfHeaders();
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Logout failed (${res.status})`);
      }

      logger.info('User signed out via /logout confirmation', {
        service: 'auth',
      });
      router.push('/login');
    } catch (err) {
      logger.error('Logout request failed', err, { service: 'auth' });
      setError(
        err instanceof Error
          ? err.message
          : 'Could not sign you out. Please try again.'
      );
      setIsLoggingOut(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12'>
      <div className='max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8'>
        <div className='mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-teal-50 mb-5'>
          <LogOut className='h-7 w-7 text-teal-600' />
        </div>

        <h1 className='text-2xl font-semibold text-gray-900 text-center mb-2'>
          Sign out of Mintenance?
        </h1>
        <p className='text-sm text-gray-600 text-center mb-6'>
          You&apos;ll be returned to the login page. Anything you have not saved
          will be lost.
        </p>

        {error && (
          <div className='mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        )}

        <div className='flex flex-col gap-3'>
          <button
            type='button'
            onClick={handleLogout}
            disabled={isLoggingOut}
            className='inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
          >
            {isLoggingOut ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                Signing out…
              </>
            ) : (
              <>
                <LogOut className='h-4 w-4' />
                Sign out
              </>
            )}
          </button>

          <Link
            href='/dashboard'
            prefetch={false}
            className='inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
          >
            <ArrowLeft className='h-4 w-4' />
            Stay signed in
          </Link>
        </div>
      </div>
    </div>
  );
}
