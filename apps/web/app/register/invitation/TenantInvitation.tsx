'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getCsrfToken } from '@/lib/csrf-client';

export function TenantInvitation() {
  const token = useSearchParams().get('token') ?? '';
  const valid = token.length > 0 && token.length <= 256;
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const returnPath = `/register/invitation?token=${encodeURIComponent(token)}`;
  async function accept() {
    if (busy.current || !valid) return;
    busy.current = true;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/tenant-invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': await getCsrfToken(),
        },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(
          response.status === 401
            ? 'Sign in with the invited email, then return here to accept.'
            : response.status === 403
              ? 'Verify your email and sign in with the invited address, then try again.'
              : 'This invitation could not be accepted. Please retry, or ask your property manager to check it.'
        );
        return;
      }
      if (
        result.success !== true ||
        typeof result.property_id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          result.property_id
        )
      )
        throw new Error('Unconfirmed');
      setPropertyId(result.property_id);
    } catch {
      setMessage(
        'Acceptance could not be confirmed. Your invitation is still here; please retry.'
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <main className='mx-auto max-w-lg p-6 space-y-4'>
      <h1 className='text-2xl font-semibold'>Your property invitation</h1>
      {!valid ? (
        <p role='alert'>
          The invitation link is incomplete. Ask your property manager for a new
          link.
        </p>
      ) : propertyId ? (
        <>
          <p role='status'>Invitation accepted.</p>
          <Link href={`/properties/${propertyId}`} className='underline'>
            Open property
          </Link>
        </>
      ) : (
        <>
          <p>
            Use the email address your property manager invited. If you have
            just registered, verify your email before accepting. You can reopen
            this link after verification.
          </p>
          <div className='flex flex-wrap gap-4'>
            <Link
              href={`/login?redirect=${encodeURIComponent(returnPath)}`}
              className='underline'
            >
              Sign in
            </Link>
            <Link
              href={`/register?invite=${encodeURIComponent(token)}`}
              className='underline'
            >
              Create account
            </Link>
          </div>
          <button
            type='button'
            className='btn btn-primary'
            disabled={saving}
            onClick={accept}
          >
            {saving ? 'Accepting…' : 'Accept invitation'}
          </button>
          {message && <p role='alert'>{message}</p>}
        </>
      )}
    </main>
  );
}
