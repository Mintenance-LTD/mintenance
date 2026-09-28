'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function SharedPropertiesRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <section role='alert' className='card card-pad'>
      <p>Shared properties could not be loaded.</p>
      <button
        className='btn btn-secondary'
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {pending ? 'Retrying…' : 'Retry shared properties'}
      </button>
    </section>
  );
}
