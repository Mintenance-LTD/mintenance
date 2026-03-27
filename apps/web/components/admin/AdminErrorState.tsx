'use client';

import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export function AdminErrorState({
  message = 'Something went wrong',
  onRetry,
}: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 16px',
        textAlign: 'center',
      }}
      role='alert'
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: '#FEE2E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon name='x' size={32} color='#991B1B' />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Error</h3>
      <p
        style={{
          fontSize: 14,
          color: '#64748b',
          maxWidth: 384,
          marginBottom: onRetry ? 16 : 0,
        }}
      >
        {message}
      </p>
      {onRetry && (
        <Button variant='outline' onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
