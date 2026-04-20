'use client';

/**
 * Accept-invite page — R6 #18 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Fetches the invitation details via /api/organizations/accept-invite?token=…
 * and lets the signed-in user accept it with one click. If the current
 * session's email doesn't match the invited email, we explain what to do.
 */

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

interface Preview {
  orgId: string;
  orgName: string;
  orgType: string | null;
  role: string;
  invitedEmail: string;
  matchesYou: boolean;
}

export default function AcceptInvitePage() {
  // useSearchParams() in Next.js 14+ requires a Suspense boundary when
  // the page is CSR-bailed out (as here, with 'use client'). Splitting
  // into an Inner component keeps the hook call inside Suspense.
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center text-gray-500'>
          Checking your invitation…
        </div>
      }
    >
      <AcceptInviteInner />
    </Suspense>
  );
}

function AcceptInviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `/api/organizations/accept-invite?token=${encodeURIComponent(token)}`,
          { credentials: 'same-origin' }
        );
        const json = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            // Not signed in yet — send them through login with a redirect back.
            router.replace(
              `/login?returnUrl=${encodeURIComponent(`/accept-invite?token=${token}`)}`
            );
            return;
          }
          setError(json?.error?.message || 'Could not load invitation');
        } else {
          setPreview(json as Preview);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, [router, token]);

  async function accept() {
    setAccepting(true);
    try {
      const res = await fetch('/api/organizations/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message || 'Could not accept invite');
        return;
      }
      toast.success('You are now a member of the organization');
      router.replace('/contractor/team');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Accept failed');
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center text-gray-500'>
        Checking your invitation…
      </div>
    );
  }

  if (error) {
    return (
      <div className='max-w-md mx-auto px-4 py-16 text-center'>
        <ShieldAlert className='w-10 h-10 text-red-500 mx-auto mb-3' />
        <h1 className='text-xl font-semibold text-gray-900 mb-2'>
          Invitation not available
        </h1>
        <p className='text-gray-600'>{error}</p>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  return (
    <div className='max-w-md mx-auto px-4 py-16'>
      <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center'>
        <CheckCircle2 className='w-12 h-12 text-emerald-500 mx-auto mb-4' />
        <h1 className='text-2xl font-bold text-gray-900 mb-1'>
          Join {preview.orgName}
        </h1>
        <p className='text-gray-600 mb-6'>
          You&apos;ve been invited as{' '}
          <span className='font-semibold'>
            {preview.role.replace('_', ' ')}
          </span>
          .
        </p>

        {preview.matchesYou ? (
          <button
            onClick={accept}
            disabled={accepting}
            className='w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50'
          >
            {accepting ? 'Accepting…' : 'Accept invitation'}
          </button>
        ) : (
          <div className='text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 text-left'>
            This invite was sent to <strong>{preview.invitedEmail}</strong>, but
            you&apos;re signed in with a different account. Sign out and sign
            back in as that email, or ask the sender to re-invite your current
            email.
          </div>
        )}
      </div>
    </div>
  );
}
