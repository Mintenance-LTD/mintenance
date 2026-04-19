'use client';

/**
 * AddCoSignerDialog — primary homeowner adds a second homeowner to the
 * contract signing circle.
 *
 * R3 #4 of docs/RETENTION_ROADMAP_2026.md. Drives
 * POST /api/contracts/[id]/invite-cosigner.
 */

import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  contractId: string;
  /** Shown on the trigger button. */
  triggerLabel?: string;
  onInvited?: () => void;
}

export function AddCoSignerDialog({
  contractId,
  triggerLabel = 'Invite a co-signer',
  onInvited,
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/invite-cosigner`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `status ${res.status}`);
      }
      toast.success(
        data.requires_email_invite
          ? `Invite recorded. They'll be asked to sign next time they visit Mintenance.`
          : 'Co-signer invited — they can now sign in from their dashboard.'
      );
      setEmail('');
      setOpen(false);
      onInvited?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className='text-sm font-medium text-teal-700 hover:text-teal-800 underline underline-offset-4'
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <div
      role='dialog'
      aria-labelledby='cosigner-title'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
    >
      <div className='bg-white rounded-2xl max-w-md w-full shadow-xl p-6'>
        <h2
          id='cosigner-title'
          className='text-lg font-bold text-gray-900 mb-1'
        >
          Invite a co-signer
        </h2>
        <p className='text-sm text-gray-600 mb-4'>
          Add a partner or co-owner so they can review and sign the contract.
          The job stays pending until everyone has signed.
        </p>
        <label className='block text-sm'>
          <span className='text-gray-700 font-medium'>Their email</span>
          <input
            type='email'
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='partner@example.com'
            className='mt-1 w-full border border-gray-300 rounded-lg px-3 py-2'
          />
        </label>
        <div className='mt-5 flex justify-end gap-2'>
          <button
            onClick={() => {
              setEmail('');
              setOpen(false);
            }}
            disabled={submitting}
            className='px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-semibold'
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !email.trim()}
            className='px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50'
          >
            {submitting ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddCoSignerDialog;
