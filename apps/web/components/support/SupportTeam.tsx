'use client';
import { useState } from 'react';
type Operator = {
  admin_id: string;
  name?: string;
  available: boolean;
  capacity: number;
  can_broadcast: boolean;
};
export function SupportTeam({
  operators,
  api,
  onResult,
  onSaved,
}: {
  operators: Operator[];
  api: <T>(path: string, method?: string, payload?: unknown) => Promise<T>;
  onResult: (s: string) => void;
  onSaved: () => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [approved, setApproved] = useState(true);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(work: () => Promise<unknown>) {
    setBusy(true);
    try {
      await work();
      onResult('Settings saved.');
      await onSaved();
    } catch (e) {
      onResult(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className='rounded-xl border bg-white p-5 space-y-4'>
      <h2 className='text-xl font-semibold'>
        Team availability and beta access
      </h2>
      <p>
        Pause assignments when an operator is away. Existing cases stay with
        their owner until you hand them over.
      </p>
      {operators.map((o) => (
        <form
          key={o.admin_id}
          className='flex flex-wrap items-center gap-4'
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void save(() =>
              api('/api/admin/support/operators', 'PATCH', {
                adminId: o.admin_id,
                available: form.get('available') === 'on',
                capacity: Number(form.get('capacity')),
                canBroadcast: form.get('broadcast') === 'on',
              })
            );
          }}
        >
          <strong>{o.name || 'Operator'}</strong>
          <label>
            <input
              name='available'
              type='checkbox'
              defaultChecked={o.available}
            />{' '}
            Available
          </label>
          <label>
            Case capacity{' '}
            <input
              name='capacity'
              className='border p-2 w-20'
              type='number'
              min={1}
              max={100}
              defaultValue={o.capacity}
            />
          </label>
          <label>
            <input
              name='broadcast'
              type='checkbox'
              defaultChecked={o.can_broadcast}
            />{' '}
            Can send notifications
          </label>
          <button disabled={busy}>Save operator</button>
        </form>
      ))}
      <hr />
      <h3 className='font-semibold'>Approve or revoke mobile beta access</h3>
      <p>
        This changes mobile beta access only. It does not change account roles,
        verification or the public beta gate.
      </p>
      <label className='block'>
        Account email
        <input
          type='email'
          className='block border rounded p-2'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className='block'>
        Access
        <select
          className='block border rounded p-2'
          value={approved ? 'approve' : 'revoke'}
          onChange={(e) => setApproved(e.target.value === 'approve')}
        >
          <option value='approve'>Approved</option>
          <option value='revoke'>Revoked</option>
        </select>
      </label>
      <label className='block'>
        Reason
        <input
          className='block w-full border rounded p-2'
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <button
        disabled={busy || !email || !reason.trim()}
        onClick={() =>
          void save(() =>
            api('/api/admin/support/beta-access', 'POST', {
              email,
              approved,
              reason,
            })
          )
        }
      >
        Save beta access
      </button>
    </section>
  );
}
