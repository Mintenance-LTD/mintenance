'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PortfolioInboxClient } from './portfolio-inbox-client';

type Workspace = { id: string; name: string; role: string };
type Property = {
  id: string;
  property_name: string | null;
  address: string | null;
};
type Setup = {
  workspaces: Workspace[];
  unlinkedProperties: Property[];
  canSetUp: boolean;
};
type User = { id: string; name: string; email: string };

async function read<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const message =
      data.message ||
      (typeof data.error === 'string' ? data.error : data.error?.message);
    throw new Error(
      message || 'Could not complete this action. Please try again.'
    );
  }
  return data as T;
}

export function PortfolioWorkspace({ user }: { user: User }) {
  const [data, setData] = useState<Setup>();
  const [workspaceId, setWorkspaceId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [revision, setRevision] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [upgrade, setUpgrade] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  async function refresh(preferred?: string) {
    const response = await fetch('/api/portfolio/workspace', {
      cache: 'no-store',
    });
    setUpgrade(response.status === 402);
    const next = await read<Setup>(response);
    setData(next);
    setWorkspaceId((current) => {
      const target = preferred || current;
      return next.workspaces.some((item) => item.id === target)
        ? target
        : next.workspaces[0]?.id || '';
    });
  }

  useEffect(() => {
    void refresh().catch((error: Error) => setLoadError(error.message));
  }, []);

  const workspace = data?.workspaces.find((item) => item.id === workspaceId);

  async function setUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adding || !propertyId) return;
    setAdding(true);
    setActionError('');
    setNotice('');
    try {
      const result = await read<{ orgId: string }>(
        await fetch('/api/portfolio/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId,
            workspace:
              workspace?.role === 'owner'
                ? { action: 'link', orgId: workspace.id }
                : { action: 'create', name },
          }),
        })
      );
      await refresh(result.orgId);
      setRevision((value) => value + 1);
      setPropertyId('');
      setName('');
      setNotice('Property added to the Portfolio workspace.');
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace || workspace.role !== 'owner' || inviting) return;
    setInviting(true);
    setActionError('');
    setNotice('');
    try {
      const result = await read<{
        added: boolean;
        invitationId?: string;
        message?: string;
      }>(
        await fetch(`/api/organizations/${workspace.id}/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role: 'maintenance_coordinator' }),
        })
      );
      setEmail('');
      setNotice(
        result.added
          ? 'Teammate added. They can open Portfolio Inbox once their account has Portfolio access.'
          : result.invitationId
            ? 'Invitation recorded. The teammate must accept it before they can see tickets.'
            : result.message || 'No membership was changed.'
      );
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      setInviting(false);
    }
  }

  return (
    <>
      <section
        aria-label='Portfolio workspace'
        className='mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8'
      >
        <h1 className='text-2xl font-semibold'>Portfolio Inbox</h1>
        {!data && !loadError && <p role='status'>Checking workspace access…</p>}
        {loadError && <p role='alert'>{loadError}</p>}
        {upgrade && (
          <Link href='/pricing?feature=portfolio_mode'>View plans</Link>
        )}
        {data && (
          <>
            <p className='my-2 text-sm'>
              Portfolio ticket access is separate from sharing a property.
            </p>
            {data.workspaces.length === 0 && (
              <p className='my-2 text-sm'>
                You don’t belong to a Portfolio workspace yet. Ask the agency
                owner to add you as a maintenance coordinator.
              </p>
            )}
            {data.workspaces.length > 0 && (
              <label className='my-2 block text-sm'>
                Workspace
                <select
                  className='ml-2 rounded border p-1'
                  value={workspaceId}
                  onChange={(e) => {
                    setWorkspaceId(e.target.value);
                    setPropertyId('');
                    setEmail('');
                    setNotice('');
                    setActionError('');
                  }}
                  disabled={adding || inviting}
                >
                  {data.workspaces.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {data.canSetUp &&
              data.unlinkedProperties.length > 0 &&
              (!workspace || workspace.role === 'owner') && (
                <form
                  onSubmit={setUp}
                  className='my-3 flex flex-wrap items-end gap-3 rounded border p-3'
                >
                  {!workspace && (
                    <label className='text-sm'>
                      New workspace name
                      <input
                        className='block rounded border p-1'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={100}
                      />
                    </label>
                  )}
                  <label className='text-sm'>
                    Property to add
                    <select
                      className='block rounded border p-1'
                      value={propertyId}
                      onChange={(e) => setPropertyId(e.target.value)}
                      required
                    >
                      <option value=''>Select a property you own</option>
                      {data.unlinkedProperties.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.property_name ||
                            item.address ||
                            'Unnamed property'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className='rounded bg-teal-700 px-3 py-1 text-white disabled:opacity-60'
                    disabled={adding || !propertyId}
                  >
                    {workspace
                      ? 'Add property to workspace'
                      : 'Create workspace and add property'}
                  </button>
                </form>
              )}
            {workspace?.role === 'owner' && data.canSetUp && (
              <form onSubmit={invite} className='my-3 rounded border p-3'>
                <p className='mb-2 text-sm'>
                  A maintenance coordinator can see and update tickets for all
                  properties in <strong>{workspace.name}</strong>. This does not
                  grant property files, billing or team administration.
                </p>
                <label className='text-sm'>
                  Teammate email
                  <input
                    type='email'
                    className='mx-2 rounded border p-1'
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <button
                  className='rounded bg-teal-700 px-3 py-1 text-white disabled:opacity-60'
                  disabled={inviting || !email.trim()}
                >
                  Add maintenance coordinator
                </button>
              </form>
            )}
            {actionError && <p role='alert'>{actionError}</p>}
            {notice && <p role='status'>{notice}</p>}
          </>
        )}
      </section>
      {workspace && (
        <PortfolioInboxClient
          key={`${workspace.id}:${revision}`}
          user={user}
          workspaceId={workspace.id}
          workspaceRole={workspace.role}
        />
      )}
    </>
  );
}
