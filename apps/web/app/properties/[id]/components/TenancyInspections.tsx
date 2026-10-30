'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  INSPECTION_KINDS,
  inspectionReportPath,
  uploadedPhotoLabel,
  type TenancyFolder,
  type InspectionReport,
  type InspectionPage,
  type DatedRoomPhoto,
} from '@mintenance/shared';
import { inspectionRequest } from '@/lib/inspection-client';
const control =
  'mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900';
const button =
  'min-h-11 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
function useRecords<T>(url: string, revision: number) {
  const [state, setState] = useState<{
    data: T | null;
    error: string;
    loading: boolean;
  }>({ data: null, error: '', loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, error: '', loading: true });
    void inspectionRequest<T>(url, undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ data, error: '', loading: false });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted)
          setState({ data: null, error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [url, revision]);
  return state;
}
export default function TenancyInspections({
  propertyId,
}: {
  propertyId: string;
}) {
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(0);
  const [folder, setFolder] = useState<TenancyFolder | null>(null);
  const [create, setCreate] = useState(false);
  const [editing, setEditing] = useState<TenancyFolder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const folders = useRecords<InspectionPage<TenancyFolder>>(
    '/api/properties/' + propertyId + '/tenancies?offset=' + page,
    revision
  );
  async function saveFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await inspectionRequest(
        '/api/properties/' + propertyId + '/tenancies',
        {
          label: String(form.get('label')),
          starts_on: String(form.get('starts_on')),
          ends_on: String(form.get('ends_on')) || null,
          ...(editing ? { id: editing.id, revision: editing.revision } : {}),
        },
        undefined,
        editing ? 'PATCH' : 'POST'
      );
      setCreate(false);
      setFolder(null);
      setPage(0);
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save folder.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className='rounded-xl border border-gray-200 bg-white p-5 text-gray-900'
      aria-labelledby='tenancy-folders-title'
    >
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h4 id='tenancy-folders-title' className='font-semibold'>
          Tenancy folders & inspections
        </h4>
        {folders.data?.canCreate && (
          <button
            className={button}
            onClick={() => {
              setEditing(null);
              setCreate((v) => !v);
            }}
            aria-expanded={create}
          >
            New tenancy folder
          </button>
        )}
      </div>
      <p className='mt-2 text-sm text-gray-600'>
        Keep check-in, routine and check-out reports together. Only current
        property members can open report links.
      </p>
      {folders.loading && (
        <p role='status' className='py-4'>
          Loading tenancy folders…
        </p>
      )}
      {(folders.error || error) && (
        <div role='alert' className='my-3 text-sm text-red-800'>
          {folders.error || error}{' '}
          <button
            className='min-h-11 underline'
            onClick={() => {
              if (error.includes('changed')) {
                setCreate(false);
                setEditing(null);
                setFolder(null);
              }
              setError('');
              setRevision((v) => v + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
      {create && folders.data?.canCreate && (
        <form
          key={editing?.id ?? 'new'}
          onSubmit={saveFolder}
          className='my-4 grid gap-3 rounded-lg bg-gray-50 p-4'
        >
          <label className='text-sm'>
            Folder name
            <input
              defaultValue={editing?.label ?? ''}
              name='label'
              required
              maxLength={120}
              placeholder='e.g. Tenancy 2026–27'
              className={control}
            />
          </label>
          <div className='grid gap-3 sm:grid-cols-2'>
            <label className='text-sm'>
              Tenancy starts
              <input
                defaultValue={editing?.starts_on ?? ''}
                name='starts_on'
                type='date'
                min='1900-01-01'
                required
                className={control}
              />
            </label>
            <label className='text-sm'>
              Tenancy ends (optional)
              <input
                defaultValue={editing?.ends_on ?? ''}
                name='ends_on'
                type='date'
                min='1900-01-01'
                className={control}
              />
            </label>
          </div>
          <p className='text-xs text-gray-600'>
            A folder records a tenancy period. It does not invite tenants or
            grant access.
          </p>
          <button disabled={busy} className={button}>
            {busy
              ? 'Saving…'
              : editing
                ? 'Save folder changes'
                : 'Create folder'}
          </button>
        </form>
      )}
      {folders.data && (
        <>
          <div className='my-4 flex flex-wrap items-end gap-3'>
            <label className='min-w-0 flex-1 text-sm'>
              Tenancy folder
              <select
                className={control}
                value={folder?.id ?? ''}
                onChange={(e) =>
                  setFolder(
                    folders.data?.items.find((f) => f.id === e.target.value) ??
                      null
                  )
                }
              >
                <option value=''>Choose a tenancy</option>
                {folders.data.items.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} · {f.starts_on}
                    {f.ends_on ? ' – ' + f.ends_on : ''}
                  </option>
                ))}
              </select>
            </label>
            {page > 0 && (
              <button
                className='min-h-11 px-3 underline'
                onClick={() => {
                  setFolder(null);
                  setPage((v) => Math.max(0, v - 25));
                }}
              >
                Previous folders
              </button>
            )}
            {folders.data.hasMore && (
              <button
                className='min-h-11 px-3 underline'
                onClick={() => {
                  setFolder(null);
                  setPage((v) => v + 25);
                }}
              >
                More folders
              </button>
            )}
          </div>
          {folder && folders.data.canCreate && (
            <button
              className='min-h-11 underline'
              onClick={() => {
                setEditing(folder);
                setCreate(true);
              }}
            >
              Edit tenancy folder
            </button>
          )}
          {!folders.data.items.length && (
            <p className='text-sm'>No tenancy folders yet.</p>
          )}
          {!folders.data.canCreate && (
            <p className='text-sm text-gray-600'>
              You can read saved reports. Creating records requires property
              editing permission and the owner’s Landlord or Agency plan.
            </p>
          )}
        </>
      )}
      {folder && folders.data && (
        <FolderReports
          key={propertyId + folder.id}
          propertyId={propertyId}
          folder={folder}
        />
      )}
    </section>
  );
}
function FolderReports({
  propertyId,
  folder,
}: {
  propertyId: string;
  folder: TenancyFolder;
}) {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [create, setCreate] = useState(false);
  const reports = useRecords<InspectionPage<InspectionReport>>(
    '/api/properties/' +
      propertyId +
      '/inspections?folder=' +
      folder.id +
      '&offset=' +
      page,
    revision
  );
  return (
    <div className='border-t pt-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h5 className='font-semibold'>{folder.label}</h5>
        {reports.data?.canCreate && (
          <button
            className={button}
            onClick={() => setCreate((v) => !v)}
            aria-expanded={create}
          >
            New inspection
          </button>
        )}
      </div>
      {create && reports.data?.canCreate && (
        <ReportForm
          propertyId={propertyId}
          folderId={folder.id}
          saved={() => {
            setCreate(false);
            setPage(0);
            setRevision((v) => v + 1);
          }}
        />
      )}
      {reports.loading && <p role='status'>Loading reports…</p>}
      {reports.error && (
        <p role='alert'>
          {reports.error}{' '}
          <button
            className='min-h-11 underline'
            onClick={() => setRevision((v) => v + 1)}
          >
            Retry reports
          </button>
        </p>
      )}
      {reports.data && !reports.data.items.length && (
        <p className='py-4 text-sm text-gray-600'>
          No inspections in this tenancy yet.
        </p>
      )}
      <ul className='divide-y'>
        {reports.data?.items.map((report) => (
          <li key={report.id} className='py-3'>
            <Link
              className='block min-h-11 font-semibold text-teal-900 underline'
              href={inspectionReportPath(propertyId, report.id)}
            >
              {report.title}
            </Link>
            <p className='text-sm text-gray-600'>
              {INSPECTION_KINDS.find((k) => k.value === report.kind)?.label} ·
              Inspection date {report.inspected_on}
            </p>
          </li>
        ))}
      </ul>
      <div className='flex gap-3'>
        {page > 0 && (
          <button
            className='min-h-11 underline'
            onClick={() => setPage((v) => v - 25)}
          >
            Previous reports
          </button>
        )}
        {reports.data?.hasMore && (
          <button
            className='min-h-11 underline'
            onClick={() => setPage((v) => v + 25)}
          >
            More reports
          </button>
        )}
      </div>
    </div>
  );
}
function ReportForm({
  propertyId,
  folderId,
  saved,
}: {
  propertyId: string;
  folderId: string;
  saved: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const photos = useRecords<{ photos: DatedRoomPhoto[] }>(
    '/api/properties/' + propertyId + '/room-photos',
    revision
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await inspectionRequest(
        '/api/properties/' + propertyId + '/inspections',
        {
          folder_id: folderId,
          title: String(form.get('title')),
          kind: String(form.get('kind')),
          inspected_on: String(form.get('inspected_on')),
          notes: String(form.get('notes')),
          photo_ids: selected,
        }
      );
      saved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save report.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className='my-4 grid gap-3 rounded-lg bg-gray-50 p-4'
    >
      <label className='text-sm'>
        Report title
        <input required maxLength={160} name='title' className={control} />
      </label>
      <div className='grid gap-3 sm:grid-cols-2'>
        <label className='text-sm'>
          Inspection type
          <select name='kind' className={control}>
            {INSPECTION_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className='text-sm'>
          Inspection date
          <input
            required
            name='inspected_on'
            type='date'
            min='1900-01-01'
            className={control}
          />
        </label>
      </div>
      <label className='text-sm'>
        Observations
        <textarea name='notes' maxLength={10000} rows={4} className={control} />
      </label>
      <fieldset>
        <legend className='text-sm font-semibold'>
          Room photos (up to 50)
        </legend>
        <p className='text-xs text-gray-600'>
          Choose existing uploads. Upload dates do not prove when photos were
          taken.
        </p>
        {photos.loading && <p role='status'>Loading photos…</p>}
        {photos.error && (
          <p role='alert'>
            {photos.error}{' '}
            <button
              type='button'
              className='min-h-11 underline'
              onClick={() => {
                setRevision((v) => v + 1);
              }}
            >
              Retry photos
            </button>
          </p>
        )}
        <div className='mt-2 max-h-64 overflow-y-auto'>
          {photos.data?.photos.map((photo) => (
            <label
              key={photo.id}
              className='flex min-h-11 items-center gap-3 rounded border p-2 text-sm'
            >
              <input
                type='checkbox'
                checked={selected.includes(photo.id)}
                disabled={
                  busy ||
                  (!selected.includes(photo.id) && selected.length >= 50)
                }
                onChange={(e) =>
                  setSelected((ids) =>
                    e.target.checked
                      ? [...ids, photo.id]
                      : ids.filter((id) => id !== photo.id)
                  )
                }
              />
              <span className='min-w-0 break-words'>
                {photo.room_type.replace(/_/g, ' ')} · {photo.file_name}
                <span className='block text-xs text-gray-600'>
                  {uploadedPhotoLabel(photo.created_at)}
                </span>
              </span>
            </label>
          ))}
        </div>
        {photos.data && !photos.data.photos.length && (
          <p className='text-sm'>
            No room photos yet. You can save a written report, or add room
            photos first.
          </p>
        )}
      </fieldset>
      {error && (
        <p role='alert' className='text-sm text-red-800'>
          {error}
        </p>
      )}
      <p className='text-xs text-gray-600'>
        Saving shares this report with existing property members. Saved reports
        cannot be rewritten; record corrections in a new report. Attached images
        remain linked to the original uploads and can become unavailable if
        deleted.
      </p>
      <button
        disabled={busy || photos.loading || !!photos.error}
        className={button}
      >
        {busy ? 'Saving…' : 'Save shared report'}
      </button>
    </form>
  );
}
