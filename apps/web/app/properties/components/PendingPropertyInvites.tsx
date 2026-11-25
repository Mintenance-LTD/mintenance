'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowRight, Loader2, UserPlus } from 'lucide-react';
import { inspectionReportPath } from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';

interface Invite {
  id: string;
  role: string;
  propertyName: string;
  propertyId: string;
  propertyAddress: string | null;
}

const ROLES: Record<string, { label: string; access: string }> = {
  admin: {
    label: 'Property admin',
    access: 'Manage the property, compliance and team access.',
  },
  manager: {
    label: 'Property manager',
    access: 'Manage property records, compliance and maintenance.',
  },
  viewer: {
    label: 'Viewer',
    access: 'Open the property and its shared records with read-only access.',
  },
};

export function PendingPropertyInvites({
  compact = false,
  propertyId,
  reportId,
}: {
  compact?: boolean;
  propertyId?: string;
  reportId?: string;
}) {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  // `null` = still loading, `false` = loaded fine, `true` = the fetch failed.
  // An empty list and a failed load must not render the same way.
  const [loadFailed, setLoadFailed] = useState<boolean | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const pending = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/properties/invites', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (!Array.isArray(data?.invites))
        throw new Error('Incomplete invitations');
      setInvites(data.invites);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (inviteId: string, action: 'accept' | 'decline') => {
    if (pending.current) return;
    pending.current = true;
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
      if (
        data.success !== true ||
        data.status !== (action === 'accept' ? 'accepted' : 'declined') ||
        data.propertyId !==
          invites.find((invite) => invite.id === inviteId)?.propertyId
      )
        throw new Error('Unconfirmed invitation');
      toast.success(
        action === 'accept' ? 'Invitation accepted' : 'Invitation declined'
      );
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      window.dispatchEvent(new Event('mintenance:notifications-updated'));
      if (action === 'accept') {
        const destination =
          propertyId === data.propertyId && reportId
            ? inspectionReportPath(data.propertyId, reportId)
            : `/properties/${encodeURIComponent(data.propertyId)}`;
        router.push(destination);
      }
    } catch {
      toast.error('Could not update the invitation');
    } finally {
      pending.current = false;
      setBusyId(null);
    }
  };

  if (compact) {
    if (loadFailed === null || (!loadFailed && !invites.length)) return null;
    return (
      <Link
        href='/properties/invitations'
        className='btn btn-ghost btn-sm gap-2'
      >
        <UserPlus size={16} aria-hidden='true' />
        {loadFailed
          ? 'Property invitations'
          : `${invites.length} pending ${invites.length === 1 ? 'invitation' : 'invitations'}`}
        <ArrowRight size={15} aria-hidden='true' />
      </Link>
    );
  }

  if (loadFailed === null) return <p role='status'>Loading invitations…</p>;

  if (loadFailed) {
    return (
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
    );
  }

  const visible = propertyId
    ? invites.filter((invite) => invite.propertyId === propertyId)
    : invites;
  if (!visible.length) {
    return (
      <div className='card card-pad'>
        <p>
          {propertyId
            ? 'There is no pending invitation for this property on your account.'
            : 'You have no pending property invitations.'}
        </p>
        {propertyId && (
          <Link
            href='/properties/invitations'
            className='mt-3 inline-block font-semibold underline'
          >
            See all invitations
          </Link>
        )}
      </div>
    );
  }

  return (
    <section aria-label='Pending property invitations' className='space-y-4'>
      <p className='t-body'>
        A Free homeowner account can join. Your role applies to the property
        shown below.
      </p>
      <ul className='space-y-3'>
        {visible.map((invite) => (
          <li
            key={invite.id}
            className='card card-pad flex flex-wrap items-center justify-between gap-5'
          >
            <div className='min-w-0 space-y-1'>
              <h2 className='t-h2 break-words'>{invite.propertyName}</h2>
              {invite.propertyAddress && (
                <p className='t-meta'>{invite.propertyAddress}</p>
              )}
              <p className='t-body'>
                <strong>
                  {ROLES[invite.role]?.label ?? 'Property access'}.
                </strong>{' '}
                {ROLES[invite.role]?.access}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                disabled={!!busyId}
                onClick={() => void respond(invite.id, 'decline')}
                className='btn btn-ghost'
              >
                Decline
              </button>
              <button
                type='button'
                disabled={!!busyId}
                onClick={() => void respond(invite.id, 'accept')}
                className='btn btn-primary'
              >
                {busyId === invite.id && (
                  <Loader2 className='w-3 h-3 animate-spin' />
                )}
                {reportId ? 'Accept and open report' : 'Accept invitation'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
