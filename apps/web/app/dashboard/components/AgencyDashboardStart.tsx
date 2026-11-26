'use client';

import Link from 'next/link';
import { Building2, ClipboardList, FileText } from 'lucide-react';
import { usePropertyView } from '@/hooks/usePropertyView';
import styles from './AgencyDashboardStart.module.css';

export function AgencyDashboardStart() {
  const { enabled, ready, view } = usePropertyView();
  if (!enabled || !ready || view !== 'agency') return null;

  return (
    <section aria-labelledby='agency-start-title' className={styles.card}>
      <h2 id='agency-start-title' className={styles.heading}>
        <ClipboardList size={18} strokeWidth={1.75} aria-hidden='true' />
        Agency workspace
      </h2>
      <p className={styles.description}>
        Manage repairs, landlord assignments and document branding in one place.
      </p>
      <div className={styles.actions}>
        <Link href='/portfolio' className={styles.primary}>
          Open Agency workspace
        </Link>
        <Link href='/properties/work-queue' className={styles.secondary}>
          Action queue
        </Link>
        <Link href='/landlord/reports' className={styles.secondary}>
          <FileText size={15} strokeWidth={1.75} aria-hidden='true' />
          Tenant reports
        </Link>
        <Link href='/properties' className={styles.secondary}>
          <Building2 size={15} strokeWidth={1.75} aria-hidden='true' />
          Properties
        </Link>
      </div>
      <p className={styles.hint}>
        Invite teammates from a property’s Manage tab under People and access.
      </p>
    </section>
  );
}
