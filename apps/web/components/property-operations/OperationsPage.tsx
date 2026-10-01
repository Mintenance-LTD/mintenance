'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import styles from './operations.module.css';
export function OperationsPage({
  title,
  eyebrow,
  description,
  backHref,
  backLabel,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  backHref: string;
  backLabel: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <HomeownerPageWrapper>
      <div className={styles.page}>
        <Link href={backHref} className={styles.back}>
          <ArrowLeft size={16} />
          {backLabel}
        </Link>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1>{title}</h1>
            <p className={styles.description}>{description}</p>
          </div>
          {action}
        </header>
        {children}
      </div>
    </HomeownerPageWrapper>
  );
}
