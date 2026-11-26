'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Layers3,
  LoaderCircle,
  RotateCw,
  Users,
} from 'lucide-react';
import { PortfolioInboxClient } from './portfolio-inbox-client';
import { PortfolioDocumentBranding } from './portfolio-document-branding';
import { PortfolioAgencyLandlords } from './portfolio-agency-landlords';

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

export function PortfolioWorkspace({
  user,
  targetOrgId,
  targetTicketId,
  crm = false,
}: {
  user: User;
  targetOrgId?: string;
  targetTicketId?: string;
  crm?: boolean;
}) {
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
    void refresh(targetOrgId).catch((error: Error) =>
      setLoadError(error.message)
    );
  }, [targetOrgId]);

  const workspace = data?.workspaces.find((item) => item.id === workspaceId);

  async function setUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adding || !propertyId || (!workspace && name.trim().length < 2)) return;
    setAdding(true);
    setActionError('');
    setNotice('');
    try {
      const result = await read<{ orgId: string }>(
        await fetch('/api/portfolio/workspace', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getCsrfHeaders()),
          },
          body: JSON.stringify({
            propertyId,
            workspace:
              workspace?.role === 'owner'
                ? { action: 'link', orgId: workspace.id }
                : { action: 'create', name: name.trim() },
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
          headers: {
            'Content-Type': 'application/json',
            ...(await getCsrfHeaders()),
          },
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

  const field =
    'mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-950 shadow-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/25 sm:text-sm';
  const primary =
    'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600 sm:w-auto';
  const secondary =
    'inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-teal-900 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800';
  const panel =
    'min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm';
  const firstSetup = !!data && !workspace && data.canSetUp;
  const hasUnlinked = !!data?.unlinkedProperties.length;
  const workspaceTools = !!data?.canSetUp && workspace?.role === 'owner';
  const canOpenDirectory =
    !!workspace &&
    ['owner', 'manager', 'maintenance_coordinator'].includes(workspace.role);
  const inboxHref = workspace
    ? '/portfolio?' + new URLSearchParams({ orgId: workspace.id }).toString()
    : '/portfolio';

  function propertyField() {
    return (
      <label className='block min-w-0 text-sm font-semibold text-slate-800'>
        Property to add
        <select
          className={field}
          value={propertyId}
          onChange={(event) => setPropertyId(event.target.value)}
          disabled={adding}
          required
        >
          <option value=''>Select a property you own</option>
          {data?.unlinkedProperties.map((item) => (
            <option key={item.id} value={item.id}>
              {item.property_name || item.address || 'Unnamed property'}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <main className='min-h-screen bg-slate-50 text-slate-950'>
      <div className='border-b border-slate-200 bg-white'>
        <div className='mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 py-2 sm:px-8'>
          <Link href={crm ? inboxHref : '/properties'} className={secondary}>
            <ArrowLeft size={16} aria-hidden='true' />{' '}
            {crm ? 'Portfolio Inbox' : 'Properties'}
          </Link>
          <span className='hidden text-sm font-semibold text-slate-500 sm:block'>
            Mintenance · Property management
          </span>
        </div>
      </div>

      <div className='mx-auto w-full max-w-6xl px-4 pb-12 pt-7 sm:px-8 sm:pt-10'>
        <header className='mb-6 flex flex-wrap items-end justify-between gap-5 sm:mb-8'>
          <div className='min-w-0'>
            <p className='mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-800'>
              <Layers3 size={17} aria-hidden='true' /> Property management
            </p>
            <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
              {crm ? 'Agency CRM' : 'Portfolio Inbox'}
            </h1>
            <p className='mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base'>
              {crm
                ? 'Manage landlords, assigned staff, properties and recorded works authorisation limits.'
                : 'Track repairs across your properties and hand work over to your team.'}
            </p>
          </div>
          {workspace && (
            <label className='block w-full min-w-0 text-sm font-semibold text-slate-800 sm:w-64'>
              Workspace
              <select
                className={field}
                value={workspaceId}
                onChange={(event) => {
                  setWorkspaceId(event.target.value);
                  setPropertyId('');
                  setEmail('');
                  setNotice('');
                  setActionError('');
                }}
                disabled={adding || inviting}
              >
                {data?.workspaces.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </header>

        {!data && !loadError && (
          <p
            className={
              panel + ' flex items-center gap-3 p-6 text-sm text-slate-600'
            }
            role='status'
          >
            <LoaderCircle
              size={20}
              aria-hidden='true'
              className='motion-safe:animate-spin text-teal-800'
            />
            Checking workspace access…
          </p>
        )}

        {loadError && (
          <section
            className={panel + ' max-w-xl p-5 sm:p-7'}
            aria-labelledby='portfolio-access-title'
          >
            <h2 id='portfolio-access-title' className='text-xl font-semibold'>
              {upgrade
                ? 'Portfolio access required'
                : 'Couldn’t load your workspace'}
            </h2>
            <p role='alert' className='mt-2 text-sm leading-6 text-slate-700'>
              {loadError}
            </p>
            {upgrade ? (
              <Link
                href='/pricing?feature=portfolio_mode'
                className={secondary}
              >
                View plans <ArrowRight size={16} aria-hidden='true' />
              </Link>
            ) : (
              <button
                type='button'
                className={secondary}
                onClick={() => {
                  setLoadError('');
                  void refresh().catch((error: Error) =>
                    setLoadError(error.message)
                  );
                }}
              >
                Try again <RotateCw size={16} aria-hidden='true' />
              </button>
            )}
          </section>
        )}

        {data && !workspace && (
          <div className='grid min-w-0 gap-4 lg:grid-cols-[1.45fr_1fr] lg:gap-6'>
            <section
              className={panel + ' p-5 sm:p-8'}
              aria-labelledby='portfolio-start-title'
            >
              <span className='inline-flex size-11 items-center justify-center rounded-xl bg-teal-100 text-teal-900'>
                {firstSetup ? (
                  <Building2 size={22} aria-hidden='true' />
                ) : (
                  <Users size={22} aria-hidden='true' />
                )}
              </span>
              <h2
                id='portfolio-start-title'
                className='mt-4 text-2xl font-bold tracking-tight'
              >
                {firstSetup
                  ? 'Set up your workspace'
                  : 'You haven’t joined a workspace yet'}
              </h2>
              <p className='mt-2 max-w-lg text-sm leading-6 text-slate-600'>
                {firstSetup
                  ? 'Give your workspace a name and add the first property you want to manage. You can add more properties later.'
                  : 'Ask the agency owner to add you using the email address you sign in with. Sharing a property with you doesn’t give you access to its Portfolio tickets.'}
              </p>
              {firstSetup && hasUnlinked && (
                <form onSubmit={setUp} className='mt-6 grid min-w-0 gap-4'>
                  <label className='block min-w-0 text-sm font-semibold text-slate-800'>
                    New workspace name
                    <input
                      className={field}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder='e.g. Brookfield Lettings'
                      autoComplete='organization'
                      required
                      minLength={2}
                      maxLength={100}
                      disabled={adding}
                    />
                  </label>
                  {propertyField()}
                  {actionError && (
                    <p role='alert' className='text-sm text-red-800'>
                      {actionError}
                    </p>
                  )}
                  <button
                    className={primary + ' mt-1 sm:justify-self-start'}
                    disabled={adding || !propertyId || name.trim().length < 2}
                  >
                    {adding ? 'Creating workspace…' : 'Create workspace'}
                    {!adding && <ArrowRight size={17} aria-hidden='true' />}
                  </button>
                </form>
              )}
              {firstSetup && !hasUnlinked && (
                <div className='mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-sm font-semibold text-slate-900'>
                    No properties available to add
                  </p>
                  <p className='mt-1 text-sm leading-6 text-slate-600'>
                    You need a property you own that isn’t already linked to
                    another workspace.
                  </p>
                  <Link href='/properties/add' className={secondary}>
                    Add a property <ArrowRight size={16} aria-hidden='true' />
                  </Link>
                </div>
              )}
            </section>

            <aside
              className='min-w-0 rounded-2xl border border-teal-900 bg-teal-950 p-5 text-white sm:p-8'
              aria-labelledby='portfolio-next-title'
            >
              <p className='text-xs font-bold uppercase tracking-widest text-teal-200'>
                Your repair workspace
              </p>
              <h2
                id='portfolio-next-title'
                className='mt-3 text-2xl font-semibold tracking-tight'
              >
                What happens next
              </h2>
              <ol className='mt-5 divide-y divide-teal-800'>
                {[
                  [
                    'Log the repair',
                    'Create a ticket against the right property.',
                  ],
                  [
                    'Keep track of progress',
                    'Update the status and record what’s been done.',
                  ],
                  [
                    'Hand work over',
                    'Give a maintenance coordinator access to workspace tickets.',
                  ],
                ].map(([title, description], index) => (
                  <li
                    key={title}
                    className='flex items-start gap-3.5 py-3.5 first:pt-0'
                  >
                    <span
                      aria-hidden='true'
                      className='flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-800 text-xs font-bold text-white'
                    >
                      0{index + 1}
                    </span>
                    <div>
                      <p className='text-sm font-semibold'>{title}</p>
                      <p className='mt-0.5 text-sm leading-5 text-teal-100'>
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              {firstSetup && (
                <div className='mt-3 border-t border-teal-800 pt-4'>
                  <p className='text-sm font-semibold'>
                    Joining an existing team?
                  </p>
                  <p className='mt-1 text-sm leading-5 text-teal-100'>
                    Ask the agency owner to add you instead of creating a new
                    workspace.
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}

        {notice && (
          <p
            role='status'
            className='mb-5 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950'
          >
            {notice}
          </p>
        )}
        {!crm && workspaceTools && (
          <details key={workspace?.id} className={panel + ' mb-5 p-4 sm:p-5'}>
            <summary className='cursor-pointer rounded-md py-2 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-800'>
              Manage workspace
            </summary>
            <p className='mt-2 text-sm text-slate-600'>
              Portfolio ticket access is separate from sharing a property.
            </p>
            <div className='mt-5 grid gap-5 lg:grid-cols-2'>
              <section className='min-w-0 rounded-xl border border-slate-200 p-4'>
                <h2 className='font-semibold'>Properties</h2>
                {hasUnlinked ? (
                  <form onSubmit={setUp} className='mt-3 grid gap-3'>
                    {propertyField()}
                    <button
                      className={primary + ' sm:justify-self-start'}
                      disabled={adding || !propertyId}
                    >
                      {adding
                        ? 'Adding property…'
                        : 'Add property to workspace'}
                    </button>
                  </form>
                ) : (
                  <p className='mt-2 text-sm text-slate-600'>
                    There are no unlinked properties you own.
                  </p>
                )}
              </section>
              <section className='min-w-0 rounded-xl border border-slate-200 p-4'>
                <h2 className='font-semibold'>Team access</h2>
                <p className='mt-2 text-sm leading-6 text-slate-600'>
                  A maintenance coordinator can update workspace tickets, but
                  doesn’t get access to property files, billing or team
                  administration.
                </p>
                <form onSubmit={invite} className='mt-3 grid gap-3'>
                  <label className='block min-w-0 text-sm font-semibold text-slate-800'>
                    Teammate email
                    <input
                      type='email'
                      className={field}
                      required
                      maxLength={254}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={inviting}
                    />
                  </label>
                  <button
                    className={primary + ' sm:justify-self-start'}
                    disabled={inviting || !email.trim()}
                  >
                    {inviting
                      ? 'Adding coordinator…'
                      : 'Add maintenance coordinator'}
                  </button>
                </form>
              </section>
            </div>
            {workspace && (
              <PortfolioDocumentBranding workspaceId={workspace.id} />
            )}
            {actionError && (
              <p role='alert' className='mt-4 text-sm text-red-800'>
                {actionError}
              </p>
            )}
          </details>
        )}
        {workspace && canOpenDirectory && (
          <PortfolioAgencyLandlords
            key={`landlords:${workspace.id}`}
            workspaceId={workspace.id}
            alwaysOpen={crm}
          />
        )}
        {crm && workspace && !canOpenDirectory && (
          <p role='status' className={panel + ' p-4 text-sm text-slate-600'}>
            Your workspace role does not include access to the landlord
            directory.
          </p>
        )}
        {!crm && workspace && (
          <PortfolioInboxClient
            key={workspace.id + ':' + revision + ':' + (targetTicketId ?? '')}
            user={user}
            workspaceId={workspace.id}
            workspaceRole={workspace.role}
            initialTicketId={
              workspace.id === targetOrgId ? targetTicketId : undefined
            }
          />
        )}
      </div>
    </main>
  );
}
