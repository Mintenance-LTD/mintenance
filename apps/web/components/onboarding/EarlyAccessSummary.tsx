'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { earlyAccessBenefits } from '@mintenance/shared';
export function EarlyAccessSummary({
  userId,
  role,
}: {
  userId: string;
  role: string;
}) {
  const [status, setStatus] = useState<{
    role: string;
    earlyAccess?: { eligible: boolean };
    platformFeePercent?: string;
  } | null>(null);
  useEffect(() => {
    if (role !== 'homeowner' && role !== 'contractor') return;
    const controller = new AbortController();
    fetch('/api/subscriptions/status', { signal: controller.signal })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          if (!controller.signal.aborted) setStatus(data);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [userId, role]);
  if (!status?.earlyAccess?.eligible || status.role !== role) return null;
  const benefits = earlyAccessBenefits(role, status.platformFeePercent);
  return (
    <section
      aria-label='Early-user benefits'
      className='rounded-xl border border-[var(--me-brand)] bg-[var(--me-brand-soft)] p-5'
    >
      <h2 className='text-lg font-semibold'>{benefits.title}</h2>
      <p>{benefits.description}</p>
      <ul className='my-3 list-disc pl-5'>
        {benefits.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Link
        className='underline'
        href={
          role === 'contractor'
            ? '/contractor/subscription'
            : '/homeowner/subscription'
        }
      >
        View your benefits
      </Link>
    </section>
  );
}
