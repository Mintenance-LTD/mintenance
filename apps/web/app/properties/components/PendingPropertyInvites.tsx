'use client';

/**
 * Pending property-team invitations, shown to the invited person.
 *
 * This is the missing half of the team feature. Invites were written to
 * property_team_members and emailed, but the invitee had no way to see or
 * accept one — the table's only RLS policy was owner-scoped and no route
 * existed. Production holds zero team rows as a result.
 *
 * Renders nothing at all when there are no invitations, so it costs the
 * ordinary properties page nothing.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { getCsrfHeaders } from '@/lib/csrf-client';

interface Invite {
  id: string;
  role: string;
  propertyName: string;
  propertyAddress: string | null;
}

const ROLE_BLURB: Record<string, string> = {
  admin: 'manage the property, its compliance and its team',
  manager: 'manage the property, its compliance and its jobs',
  viewer: 'view the property',
};

export function PendingPropertyInvites() {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  // `null` = still loading, `false` = loaded fine, `true` = the fetch failed.
  // An empty list and a failed load must not render the same way.
  const [loadFailed, setLoadFailed] = useState<boolean | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/properties/invites');
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setInvites(Array.isArray(data?.invites) ? data.invites : []);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (inviteId: string, action: 'accept' | 'decline') => {
    setBusyId(inviteId);
    try {
      const res = await fetch('/api/properties/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify({ inviteId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not update the invitation');
        return;
      }
      toast.success(
        action === 'accept' ? 'Invitation accepted' : 'Invitation declined'
      );
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      // An accepted invite adds a property to the list behind this banner.
      if (action === 'accept') router.refresh();
    } catch {
      toast.error('Could not update the invitation');
    } finally {
      setBusyId(null);
    }
  };

  if (loadFailed === null) return null; // first paint, nothing to say yet

  if (loadFailed) {
    return (
      <div className='max-w-6xl mx-auto px-4 sm:px-6 pt-6'>
        <div className='flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3'>
          <p className='text-sm text-amber-800'>
            We couldn&apos;t check whether you have any property invitations.
          </p>
          <button
            type='button'
            onClick={() => void load()}
            className='text-sm font-semibold text-amber-900 underline underline-offset-2'
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (invites.length === 0) return null;

  return (
    <div className='max-w-6xl mx-auto px-4 sm:px-6 pt-6'>
      <div className='rounded-xl border border-gray-200 bg-white p-4'>
        <div className='flex items-center gap-2 mb-3'>
          <UserPlus className='w-4 h-4 text-teal-600' />
          <h2 className='text-sm font-semibold text-gray-900'>
            {invites.length === 1
              ? 'You have an invitation'
              : `You have ${invites.length} invitations`}
          </h2>
        </div>

        <ul className='space-y-2'>
          {invites.map((invite) => (
            <li
              key={invite.id}
              className='flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2.5'
            >
              <div className='min-w-0'>
                <p className='text-sm font-medium text-gray-900'>
                  {invite.propertyName}
                </p>
                <p className='text-xs text-gray-500'>
                  {invite.propertyAddress ? `${invite.propertyAddress} · ` : ''}
                  You can {ROLE_BLURB[invite.role] ?? 'access this property'}.
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  disabled={busyId === invite.id}
                  onClick={() => void respond(invite.id, 'decline')}
                  className='px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50'
                >
                  Decline
                </button>
                <button
                  type='button'
                  disabled={busyId === invite.id}
                  onClick={() => void respond(invite.id, 'accept')}
                  className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50'
                >
                  {busyId === invite.id && (
                    <Loader2 className='w-3 h-3 animate-spin' />
                  )}
                  Accept
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
