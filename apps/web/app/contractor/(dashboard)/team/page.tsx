'use client';

/**
 * Contractor Team page — R6 #18 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Live-wired against /api/organizations/:id/members + /invite. The
 * signed-in user needs to belong to at least one contractor_company
 * organization. If they don't yet, we show an onboarding prompt.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Users, Plus, Trash2, Mail, ShieldCheck } from 'lucide-react';
import { InviteMemberDialog, type OrgRole } from './InviteMemberDialog';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Org {
  id: string;
  name: string;
  organization_type: string;
  myRole: OrgRole;
}

interface MemberProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company_name: string | null;
}

interface Member {
  id: string;
  user_id: string;
  org_role: OrgRole;
  status: string;
  created_at: string;
  profile: MemberProfile | null;
}

interface PendingInvite {
  id: string;
  invited_email: string;
  org_role: OrgRole;
  created_at: string;
}

function roleBadgeClass(role: OrgRole): string {
  switch (role) {
    case 'owner':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'manager':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'dispatcher':
    case 'maintenance_coordinator':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'accountant':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export default function ContractorTeamPage() {
  const confirm = useConfirm();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  // Hydration-safe theme detection — Phase-4 contractor port pattern.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  const loadMembers = useCallback(async (orgId: string) => {
    const res = await fetch(`/api/organizations/${orgId}/members`, {
      credentials: 'same-origin',
    });
    if (!res.ok) {
      setMembers([]);
      setPending([]);
      return;
    }
    const json = await res.json();
    setMembers((json.members || []) as Member[]);
    setPending((json.pendingInvitations || []) as PendingInvite[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/user/organizations', {
          credentials: 'same-origin',
        });
        if (!res.ok) {
          if (!cancelled) setOrgs([]);
          return;
        }
        const json = await res.json();
        const list = (json.organizations || []) as Org[];
        if (cancelled) return;
        setOrgs(list);
        const contractorOrg =
          list.find((o) => o.organization_type === 'contractor_company') ||
          list[0] ||
          null;
        setActiveOrg(contractorOrg);
        if (contractorOrg) {
          await loadMembers(contractorOrg.id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMembers]);

  async function remove(member: Member) {
    if (!activeOrg) return;
    const ok = await confirm({
      title: 'Remove team member?',
      description: `Remove ${member.profile?.email ?? member.user_id} from ${activeOrg.name}?`,
      confirmText: 'Remove',
      destructive: true,
    });
    if (!ok) {
      return;
    }
    const res = await fetch(
      `/api/organizations/${activeOrg.id}/members?userId=${member.user_id}`,
      { method: 'DELETE', credentials: 'same-origin' }
    );
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j?.error?.message || 'Could not remove member');
      return;
    }
    toast.success('Member removed');
    await loadMembers(activeOrg.id);
  }

  async function revokeInvite(inv: PendingInvite) {
    if (!activeOrg) return;
    const res = await fetch(
      `/api/organizations/${activeOrg.id}/invite?invitationId=${inv.id}`,
      { method: 'DELETE', credentials: 'same-origin' }
    );
    if (!res.ok) {
      toast.error('Could not revoke invite');
      return;
    }
    toast.success('Invitation revoked');
    await loadMembers(activeOrg.id);
  }

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center text-gray-500'>
        Loading your team…
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div className='max-w-2xl mx-auto px-4 py-16 text-center'>
        <Users className='w-12 h-12 text-gray-400 mx-auto mb-4' />
        <h1 className='text-2xl font-bold text-gray-900 mb-2'>
          You don&apos;t have a team yet
        </h1>
        <p className='text-gray-600 mb-6'>
          Create a contractor company to invite teammates, share jobs, and keep
          a dispatcher / field-crew workflow.
        </p>
        <Link
          href='/contractor/onboarding'
          className='inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700'
        >
          <Plus className='w-4 h-4' /> Create company
        </Link>
      </div>
    );
  }

  const canManage =
    activeOrg.myRole === 'owner' || activeOrg.myRole === 'manager';

  // Hydration-safe theme detection — Phase-4 contractor port pattern.
  // Placed here (post-early-returns) is acceptable because every code
  // path above this point is itself an early return; this is the
  // single `return` in the happy-path flow. React's rules-of-hooks
  // is honoured: the hook order is fixed across renders for
  // canManage = true|false (same render branch).
  return (
    <div
      className={
        isMintEditorial
          ? 'min-h-screen pb-12'
          : 'min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 pb-12'
      }
    >
      {/* Header — canonical .t-h1 + .btn-primary when Mint Editorial,
          legacy emerald gradient hero otherwise. */}
      {isMintEditorial ? (
        <div
          className='between'
          style={{ alignItems: 'flex-start', padding: '20px 0 24px' }}
        >
          <div className='col' style={{ gap: 4 }}>
            <div
              className='row'
              style={{
                gap: 6,
                alignItems: 'center',
                color: 'var(--me-ink-3)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={13} strokeWidth={1.75} />
              <span>{activeOrg.name}</span>
            </div>
            <h1 className='t-h1'>Team</h1>
            <p className='t-body'>
              {members.length} member{members.length === 1 ? '' : 's'}
              {pending.length > 0
                ? ` · ${pending.length} pending invite${pending.length === 1 ? '' : 's'}`
                : ''}
              {' — invite dispatchers, field crew, or office staff to'}
              {' collaborate on jobs.'}
            </p>
          </div>
          {canManage && (
            <button
              type='button'
              className='btn btn-primary btn-sm'
              onClick={() => setShowInvite(true)}
            >
              <Plus size={14} strokeWidth={1.75} />
              Invite teammate
            </button>
          )}
        </div>
      ) : (
        <header className='bg-gradient-to-r from-emerald-600 to-emerald-700 text-white'>
          <div className='max-w-5xl mx-auto px-4 py-10 flex items-center justify-between'>
            <div>
              <div className='flex items-center gap-2 text-emerald-100 text-sm mb-1'>
                <ShieldCheck className='w-4 h-4' />
                <span>{activeOrg.name}</span>
              </div>
              <h1 className='text-3xl font-bold'>Team</h1>
              <p className='text-emerald-100 text-sm mt-1'>
                {members.length} member{members.length === 1 ? '' : 's'}
                {pending.length > 0
                  ? ` · ${pending.length} pending invite${pending.length === 1 ? '' : 's'}`
                  : ''}
              </p>
            </div>
            {canManage && (
              <button
                onClick={() => setShowInvite(true)}
                className='bg-white text-emerald-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:shadow'
              >
                <Plus className='w-4 h-4' /> Invite teammate
              </button>
            )}
          </div>
        </header>
      )}

      <div className='max-w-5xl mx-auto px-4 mt-8 space-y-8'>
        <section className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
          <h2 className='px-6 py-4 border-b border-gray-200 text-lg font-semibold text-gray-900'>
            Members
          </h2>
          <ul className='divide-y divide-gray-100'>
            {members.map((m) => (
              <li
                key={m.id}
                className='px-6 py-4 flex items-center justify-between'
              >
                <div className='min-w-0'>
                  <p className='font-medium text-gray-900 truncate'>
                    {m.profile?.first_name || m.profile?.last_name
                      ? `${m.profile?.first_name ?? ''} ${m.profile?.last_name ?? ''}`.trim()
                      : m.profile?.email || m.user_id}
                  </p>
                  <p className='text-sm text-gray-500 truncate'>
                    {m.profile?.email ?? ''}
                  </p>
                </div>
                <div className='flex items-center gap-3'>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium border ${roleBadgeClass(m.org_role)}`}
                  >
                    {m.org_role.replace('_', ' ')}
                  </span>
                  {canManage && m.org_role !== 'owner' && (
                    <button
                      onClick={() => remove(m)}
                      title='Remove'
                      className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  )}
                </div>
              </li>
            ))}
            {members.length === 0 && (
              <li className='px-6 py-8 text-center text-gray-500'>
                No members yet.
              </li>
            )}
          </ul>
        </section>

        {canManage && pending.length > 0 && (
          <section className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
            <h2 className='px-6 py-4 border-b border-gray-200 text-lg font-semibold text-gray-900'>
              Pending invitations
            </h2>
            <ul className='divide-y divide-gray-100'>
              {pending.map((p) => (
                <li
                  key={p.id}
                  className='px-6 py-4 flex items-center justify-between'
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    <Mail className='w-5 h-5 text-gray-400' />
                    <div className='min-w-0'>
                      <p className='font-medium text-gray-900 truncate'>
                        {p.invited_email}
                      </p>
                      <p className='text-xs text-gray-500'>
                        Invited {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${roleBadgeClass(p.org_role)}`}
                    >
                      {p.org_role.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => revokeInvite(p)}
                      className='text-sm text-red-600 hover:underline'
                    >
                      Revoke
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {orgs.length > 1 && (
          <p className='text-sm text-gray-500'>
            You belong to {orgs.length} organizations. Switching org-context UI
            coming soon.
          </p>
        )}
      </div>

      <InviteMemberDialog
        orgId={activeOrg.id}
        actorRole={activeOrg.myRole}
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onInvited={() => loadMembers(activeOrg.id)}
      />
    </div>
  );
}
