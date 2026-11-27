'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2, ClipboardList, FileText, Users } from 'lucide-react';
import { usePropertyView } from '@/hooks/usePropertyView';
import styles from './AgencyDashboardStart.module.css';

export function AgencyDashboardStart() {
  const { enabled, ready, view, accountId } = usePropertyView();
  if (!enabled || !ready || view !== 'agency' || !accountId) return null;
  return <AgencyDashboardLinks key={accountId} />;
}

type WorkspaceAccess = {
  workspaces: { id: string; role: string }[];
  canSetUp: boolean;
  unlinkedProperties: unknown[];
};

function AgencyDashboardLinks() {
  const [access, setAccess] = useState<WorkspaceAccess | null>();
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch('/api/portfolio/workspace', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (response.status === 402) {
          if (!controller.signal.aborted) {
            setAccess({
              workspaces: [],
              canSetUp: false,
              unlinkedProperties: [],
            });
          }
          return;
        }
        if (!response.ok) throw new Error('Workspace access unavailable');
        const data: WorkspaceAccess = await response.json();
        if (!Array.isArray(data.workspaces))
          throw new Error('Invalid workspace response');
        if (!controller.signal.aborted) setAccess(data);
      } catch {
        if (!controller.signal.aborted) setAccess(null);
      }
    })();
    return () => controller.abort();
  }, []);

  const crmWorkspace = access?.workspaces.find(
    ({ id, role }) =>
      Boolean(id) &&
      ['owner', 'manager', 'maintenance_coordinator'].includes(role)
  );
  const canSetUp =
    access?.canSetUp && (access.unlinkedProperties?.length ?? 0) > 0;

  return (
    <section aria-labelledby='agency-start-title' className={styles.card}>
      <h2 id='agency-start-title' className={styles.heading}>
        <ClipboardList size={18} strokeWidth={1.75} aria-hidden='true' />
        Agency workspace
      </h2>
      <p className={styles.description}>
        Open your property tools. A shared property does not automatically give
        you access to an agency workspace.
      </p>
      <div className={styles.actions}>
        {access && access.workspaces.length > 0 ? (
          <Link href='/portfolio' className={styles.primary}>
            Open Agency workspace
          </Link>
        ) : canSetUp ? (
          <Link href='/portfolio' className={styles.primary}>
            Set up an Agency workspace
          </Link>
        ) : null}
        {crmWorkspace && (
          <Link
            href={
              '/portfolio?' +
              new URLSearchParams({
                orgId: crmWorkspace.id,
                view: 'crm',
              }).toString()
            }
            className={styles.secondary}
          >
            <Users size={15} strokeWidth={1.75} aria-hidden='true' />
            CRM
          </Link>
        )}
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
        {access === undefined
          ? 'Checking workspace access…'
          : access === null
            ? 'Workspace access could not be checked. Your property tools are still available.'
            : crmWorkspace
              ? 'Workspace teammates and landlord records are managed separately from property sharing.'
              : 'If you are joining an agency, ask its workspace owner to add you. You can still use your shared property tools.'}
      </p>
    </section>
  );
}
