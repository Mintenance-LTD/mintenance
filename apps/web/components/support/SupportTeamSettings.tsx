'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SupportTeam } from './SupportTeam';
import { useSupportRequest, type SupportOperators } from './useSupportRequest';

export function SupportTeamSettings() {
  const api = useSupportRequest();
  const [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: ['admin', 'support', 'operators'],
    queryFn: () => api<SupportOperators>('/api/admin/support/operators'),
    retry: false,
  });
  const data = query.data;
  const allowed = data?.operators.some(
    (operator) =>
      operator.admin_id === data.currentAdminId && operator.can_manage_team
  );
  return (
    <main className='mx-auto max-w-6xl space-y-5 p-6 [&_button]:rounded-lg [&_button]:border [&_button]:px-3 [&_button]:py-2 [&_button]:disabled:opacity-50'>
      <h1 className='text-3xl font-semibold'>Support team and beta access</h1>
      {notice && <p role='status'>{notice}</p>}
      {query.isPending && <p role='status'>Loading team settings…</p>}
      {query.isError && (
        <p role='alert'>
          Team settings are unavailable.{' '}
          <button onClick={() => void query.refetch()}>Retry</button>
        </p>
      )}
      {data && !allowed && (
        <p>You need team management permission to change these settings.</p>
      )}
      {data && allowed && (
        <SupportTeam
          key={JSON.stringify(data.operators)}
          operators={data.operators}
          api={api}
          onResult={setNotice}
          onSaved={async () => {
            await query.refetch();
          }}
        />
      )}
    </main>
  );
}
