'use client';

import { Spinner } from '@/components/ui/Spinner';

interface Props {
  message?: string;
}

export function AdminLoadingState({ message = 'Loading...' }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 16px',
      }}
      role='status'
      aria-live='polite'
    >
      <Spinner size='lg' />
      <p style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>{message}</p>
    </div>
  );
}
