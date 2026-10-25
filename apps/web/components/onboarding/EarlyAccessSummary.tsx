'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Gift } from 'lucide-react';
import styles from './Onboarding.module.css';
import { earlyAccessBenefits } from '@mintenance/shared';
export function EarlyAccessSummary({
  userId,
  role,
  compact = false,
}: {
  userId: string;
  role: string;
  compact?: boolean;
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
  if (compact)
    return (
      <section aria-label='Early-user benefits' className={styles.benefits}>
        <Gift size={18} className={styles.benefitsIcon} aria-hidden='true' />
        <div className={styles.copy}>
          <strong>{benefits.title}</strong>
          <p>
            {role === 'contractor'
              ? 'Your early-access Business plan is included.'
              : 'Your early-access Agency features are included.'}
          </p>
        </div>
        <Link
          className={styles.textButton}
          href={
            role === 'contractor'
              ? '/contractor/subscription'
              : '/homeowner/subscription'
          }
        >
          View benefits <ArrowRight size={14} aria-hidden='true' />
        </Link>
      </section>
    );
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
