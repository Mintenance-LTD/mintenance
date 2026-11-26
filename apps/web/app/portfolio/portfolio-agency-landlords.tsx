'use client';

import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { amountLabel, parsePounds } from './work-order-model';

type Landlord = {
  id: string;
  displayName: string;
  approvalLimitPence: number | null;
  primaryManagerId: string | null;
  backupManagerId: string | null;
  propertyIds: string[];
  revision: number;
};

type Directory = {
  landlords: Landlord[];
  staff: { id: string; name: string }[];
  properties: { id: string; name: string; landlordId: string | null }[];
  canEdit: boolean;
};

type Draft = {
  displayName: string;
  approvalLimit: string;
  primaryManagerId: string;
  backupManagerId: string;
  propertyIds: string[];
};

function startDraft(record?: Landlord): Draft {
  return {
    displayName: record?.displayName ?? '',
    approvalLimit:
      record?.approvalLimitPence == null
        ? ''
        : (record.approvalLimitPence / 100).toFixed(2),
    primaryManagerId: record?.primaryManagerId ?? '',
    backupManagerId: record?.backupManagerId ?? '',
    propertyIds: record?.propertyIds ?? [],
  };
}

const inputStyle =
  'mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 sm:text-sm';
const secondary =
  'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-teal-900 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-800';
const primary =
  'inline-flex min-h-11 items-center rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-60';

export function PortfolioAgencyLandlords({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <section
      aria-labelledby={id}
      className='mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'
    >
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 id={id} className='font-semibold text-slate-900'>
            Landlord directory
          </h2>
          <p className='mt-1 text-sm text-slate-600'>
            See which landlords and properties each teammate looks after.
          </p>
        </div>
        <button
          type='button'
          className={secondary}
          aria-expanded={open}
          aria-controls={id + '-directory'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Hide landlord directory' : 'Open landlord directory'}
        </button>
      </div>
      <div id={id + '-directory'} hidden={!open}>
        {open && <DirectoryPanel key={workspaceId} workspaceId={workspaceId} />}
      </div>
    </section>
  );
}

function DirectoryPanel({ workspaceId }: { workspaceId: string }) {
  const endpoint =
    '/api/organizations/' +
    encodeURIComponent(workspaceId) +
    '/agency-landlords';
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [selected, setSelected] = useState<Landlord | 'new' | null>(null);
  const [draft, setDraft] = useState(() => startDraft());
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const r = await fetch(endpoint, {
          cache: 'no-store',
          signal: abort.signal,
        });
        if (!r.ok) throw new Error('Could not load the landlord directory.');
        const data = (await r.json()) as Directory;
        if (!abort.signal.aborted) {
          setDirectory(data);
          setConflict(false);
        }
      } catch (e) {
        if (!abort.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : 'Could not load the landlord directory.'
          );
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => abort.abort();
  }, [endpoint, retry]);

  function edit(record: Landlord | 'new') {
    setSelected(record);
    setDraft(startDraft(record === 'new' ? undefined : record));
    setError('');
    setNotice('');
    setConflict(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !directory?.canEdit || saving || conflict) return;
    setError('');
    setNotice('');
    setSaving(true);
    try {
      if (
        draft.primaryManagerId &&
        draft.primaryManagerId === draft.backupManagerId
      )
        throw new Error('Choose a different backup manager.');
      const displayName = draft.displayName.trim();
      if (!displayName) throw new Error('Enter the landlord or company name.');
      const current = selected === 'new' ? null : selected;
      const r = await fetch(
        current ? endpoint + '/' + encodeURIComponent(current.id) : endpoint,
        {
          method: current ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getCsrfHeaders()),
          },
          body: JSON.stringify({
            displayName,
            approvalLimitPence: parsePounds(
              draft.approvalLimit,
              'Works authorisation limit'
            ),
            primaryManagerId: draft.primaryManagerId || null,
            backupManagerId: draft.backupManagerId || null,
            propertyIds: draft.propertyIds,
            ...(current && { revision: current.revision }),
          }),
        }
      );
      if (r.status === 409) {
        setConflict(true);
        throw new Error(
          'The directory changed. Copy any unsaved details you need, then reload the latest directory.'
        );
      }
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.landlord)
        throw new Error(
          r.status === 400 && typeof data?.message === 'string'
            ? data.message
            : 'Could not confirm the landlord was saved.'
        );
      const saved = data.landlord as Landlord;
      setDirectory(
        (previous) =>
          previous && {
            ...previous,
            landlords: [
              ...previous.landlords.filter(({ id }) => id !== saved.id),
              saved,
            ].sort((a, b) =>
              a.displayName.localeCompare(b.displayName, 'en-GB')
            ),
            properties: previous.properties.map((p) =>
              saved.propertyIds.includes(p.id)
                ? { ...p, landlordId: saved.id }
                : p.landlordId === saved.id
                  ? { ...p, landlordId: null }
                  : p
            ),
          }
      );
      setSelected(null);
      setNotice('Landlord saved. No invitation or message was sent.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the landlord.');
    } finally {
      setSaving(false);
    }
  }

  function managerName(id: string | null) {
    return id
      ? (directory?.staff.find((item) => item.id === id)?.name ??
          'No longer active')
      : 'Unassigned';
  }

  return (
    <div className='mt-3 border-t border-slate-200 pt-3'>
      <p className='text-sm text-slate-600'>
        This directory is internal. Linking a property or recording an approval
        limit does not give a landlord access or send an approval request.
      </p>
      {loading && (
        <p role='status' className='mt-2 text-sm'>
          Loading landlord directory…
        </p>
      )}
      {error && (
        <p
          role='alert'
          className='mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-800'
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role='status'
          className='mt-2 rounded-lg bg-teal-50 p-3 text-sm text-teal-900'
        >
          {notice}
        </p>
      )}
      {((!directory && !loading) || conflict) && (
        <button
          type='button'
          className={secondary}
          onClick={() => {
            setSelected(null);
            setDirectory(null);
            setRetry((value) => value + 1);
          }}
        >
          {conflict ? 'Reload and discard unsaved edits' : 'Try again'}
        </button>
      )}
      {directory && (
        <div className='mt-3 space-y-3'>
          {directory.canEdit && !selected && (
            <button
              type='button'
              className={primary}
              onClick={() => edit('new')}
            >
              Add landlord
            </button>
          )}
          {selected && directory.canEdit && (
            <form
              onSubmit={save}
              className='rounded-xl border border-teal-200 bg-teal-50/30 p-4'
            >
              <fieldset disabled={saving} className='space-y-3'>
                <legend className='font-semibold text-slate-900'>
                  {selected === 'new' ? 'New landlord' : 'Edit landlord'}
                </legend>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <label className='text-sm font-medium text-slate-800'>
                    Landlord or company name
                    <input
                      className={inputStyle}
                      required
                      maxLength={160}
                      value={draft.displayName}
                      onChange={(e) =>
                        setDraft({ ...draft, displayName: e.target.value })
                      }
                    />
                  </label>
                  <label className='text-sm font-medium text-slate-800'>
                    Works authorisation limit (£)
                    <input
                      className={inputStyle}
                      inputMode='decimal'
                      placeholder='No limit recorded'
                      value={draft.approvalLimit}
                      onChange={(e) =>
                        setDraft({ ...draft, approvalLimit: e.target.value })
                      }
                    />
                  </label>
                  {(['primaryManagerId', 'backupManagerId'] as const).map(
                    (key) => (
                      <label
                        key={key}
                        className='text-sm font-medium text-slate-800'
                      >
                        {key === 'primaryManagerId'
                          ? 'Primary manager'
                          : 'Backup manager'}
                        <select
                          className={inputStyle}
                          value={draft[key]}
                          onChange={(e) =>
                            setDraft({ ...draft, [key]: e.target.value })
                          }
                        >
                          <option value=''>Unassigned</option>
                          {draft[key] &&
                            !directory.staff.some(
                              ({ id }) => id === draft[key]
                            ) && (
                              <option value={draft[key]} disabled>
                                No longer active
                              </option>
                            )}
                          {directory.staff.map(({ id, name }) => (
                            <option value={id} key={id}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )
                  )}
                </div>
                <fieldset className='rounded-lg border border-slate-200 bg-white p-3'>
                  <legend className='px-1 text-sm font-semibold text-slate-800'>
                    Managed properties
                  </legend>
                  {!directory.properties.length && (
                    <p className='text-sm text-slate-600'>
                      Add a property to this workspace first.
                    </p>
                  )}
                  {directory.properties.map(({ id, name, landlordId }) => {
                    const elsewhere =
                      !!landlordId &&
                      (selected === 'new' || landlordId !== selected.id);
                    return (
                      <label
                        className='flex min-h-11 items-center gap-2 text-sm'
                        key={id}
                      >
                        <input
                          type='checkbox'
                          className='size-5 shrink-0 accent-teal-800'
                          checked={draft.propertyIds.includes(id)}
                          disabled={elsewhere}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setDraft((v) => ({
                              ...v,
                              propertyIds: checked
                                ? [...v.propertyIds, id]
                                : v.propertyIds.filter((item) => item !== id),
                            }));
                          }}
                        />
                        {name}
                        {elsewhere && ' (assigned to another landlord)'}
                      </label>
                    );
                  })}
                </fieldset>
              </fieldset>
              <div className='mt-3 flex flex-wrap gap-2'>
                <button
                  type='submit'
                  className={primary}
                  disabled={saving || conflict}
                >
                  {saving ? 'Saving…' : 'Save landlord'}
                </button>
                <button
                  type='button'
                  className={secondary}
                  disabled={saving}
                  onClick={() => {
                    setSelected(null);
                    setError('');
                    setConflict(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          {directory.landlords.length ? (
            <ul className='grid gap-3 md:grid-cols-2'>
              {directory.landlords.map((record) => (
                <li
                  key={record.id}
                  className='min-w-0 rounded-xl border border-slate-200 p-3'
                >
                  <h3 className='break-words text-sm font-semibold text-slate-900'>
                    {record.displayName}
                  </h3>
                  <dl className='mt-1 text-sm text-slate-700'>
                    <div>
                      {' '}
                      <dt className='inline font-medium'>Primary: </dt>
                      <dd className='inline'>
                        {managerName(record.primaryManagerId)}
                      </dd>
                    </div>
                    <div>
                      {' '}
                      <dt className='inline font-medium'>Backup: </dt>
                      <dd className='inline'>
                        {managerName(record.backupManagerId)}
                      </dd>
                    </div>
                    <div>
                      {' '}
                      <dt className='inline font-medium'>
                        Authorisation limit:{' '}
                      </dt>
                      <dd className='inline'>
                        {amountLabel(record.approvalLimitPence)}
                      </dd>
                    </div>
                  </dl>
                  <p className='mt-1 text-sm text-slate-700'>
                    {directory.properties
                      .filter(({ id }) => record.propertyIds.includes(id))
                      .map(({ name }) => name)
                      .join(', ') || 'No properties linked'}
                  </p>
                  {directory.canEdit && !selected && (
                    <button
                      type='button'
                      className={secondary}
                      onClick={() => edit(record)}
                    >
                      Edit {record.displayName}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-sm text-slate-600'>
              No landlords have been added yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
