'use client';

/**
 * InviteMemberDialog — R6 #18 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Owner / manager-only UI for inviting a teammate by email with a role.
 * Posts to /api/organizations/:id/invite; the server decides whether to
 * add the profile directly or send an invite link.
 */

import React, { useState } from 'react';
import toast from 'react-hot-toast';

export type OrgRole =
  | 'owner'
  | 'manager'
  | 'maintenance_coordinator'
  | 'dispatcher'
  | 'field'
  | 'accountant';

interface Props {
  orgId: string;
  actorRole: OrgRole;
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}

const ROLE_OPTIONS: Array<{ value: OrgRole; label: string; help: string }> = [
  { value: 'owner', label: 'Owner', help: 'Full control, including billing' },
  { value: 'manager', label: 'Manager', help: 'Manage team and operations' },
  {
    value: 'dispatcher',
    label: 'Dispatcher',
    help: 'Assign and triage jobs',
  },
  { value: 'field', label: 'Field crew', help: 'Work on assigned jobs' },
  {
    value: 'accountant',
    label: 'Accountant',
    help: 'Read financial reports and invoices',
  },
];

export function InviteMemberDialog({
  orgId,
  actorRole,
  open,
  onClose,
  onInvited,
}: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('field');
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return null;
  }

  const availableRoles = ROLE_OPTIONS.filter((r) =>
    r.value === 'owner' ? actorRole === 'owner' : true
  );

  async function submit() {
    if (!email.trim()) {
      toast.error('Enter an email address');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message || 'Could not send invite');
        return;
      }
      if (json.direct) {
        toast.success('Teammate added to your organization');
      } else {
        toast.success(`Invitation email sent to ${email.trim()}`);
      }
      setEmail('');
      setRole('field');
      onInvited();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className='bg-white rounded-xl shadow-xl max-w-md w-full p-6'
      >
        <h3 className='text-xl font-bold text-gray-900 mb-1'>
          Invite a teammate
        </h3>
        <p className='text-sm text-gray-600 mb-5'>
          We&apos;ll add them right away if they already have a Mintenance
          account. Otherwise we&apos;ll email them a signup link.
        </p>

        <label className='block text-sm font-medium text-gray-700 mb-1'>
          Email
        </label>
        <input
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='teammate@yourcompany.co.uk'
          className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent mb-4'
          disabled={submitting}
          autoFocus
        />

        <label className='block text-sm font-medium text-gray-700 mb-1'>
          Role
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as OrgRole)}
          className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
          disabled={submitting}
        >
          {availableRoles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <p className='text-xs text-gray-500 mt-2 mb-5'>
          {availableRoles.find((r) => r.value === role)?.help ?? ''}
        </p>

        <div className='flex gap-3'>
          <button
            onClick={submit}
            disabled={submitting}
            className='flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors'
          >
            {submitting ? 'Sending…' : 'Send invite'}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className='px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors'
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
