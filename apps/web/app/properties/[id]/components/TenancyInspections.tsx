'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  INSPECTION_KINDS,
  ROOM_PHOTO_TYPES,
  isInspectionDate,
  isOutsideTenancy,
  inspectionReportPath,
  uploadedPhotoLabel,
  uploadedBeforeTenancy,
  formatTenancyDate,
  tenancyPeriodLabel,
  tenancyStatus,
  type TenancyFolder,
  type InspectionReport,
  type InspectionDetail,
  type InspectionPage,
  type DatedRoomPhoto,
  type InspectionKind,
  type TenancyOverlap,
  readTenancyDateReview,
  type TenancyDateReview,
} from '@mintenance/shared';
import {
  InspectionRequestError,
  inspectionAuthRequired,
  inspectionLoginHref,
  inspectionOverlap,
  inspectionRequest,
} from '@/lib/inspection-client';
import { uploadRoomPhotos } from '@/lib/room-photo-client';
import {
  clearSavedInspectionDraft,
  clearInspectionSaveRequest,
  inspectionSaveRequestId,
  inspectionDraftKey,
  readInspectionDraft,
  writeInspectionDraft,
  type InspectionDraft,
} from '@/lib/inspection-drafts';
const control =
  'mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900';
const button =
  'min-h-11 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const leavePrompt = 'Leave without saving? Your inspection draft will be lost.';

function useRecords<T>(url: string | null, revision: number) {
  const [state, setState] = useState<{
    data: T | null;
    error: string;
    loading: boolean;
    loadedRevision: number;
    authRequired?: boolean;
  }>({ data: null, error: '', loading: true, loadedRevision: -1 });
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setState({ data: null, error: '', loading: true, loadedRevision: -1 });
    void inspectionRequest<T>(url, undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({
            data,
            error: '',
            loading: false,
            loadedRevision: revision,
          });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted)
          setState({
            data: null,
            error: error.message,
            authRequired: inspectionAuthRequired(error),
            loading: false,
            loadedRevision: revision,
          });
      });
    return () => controller.abort();
  }, [url, revision]);
  return state;
}
export default function TenancyInspections({
  propertyId,
  initialFolderId,
  correctsReportId,
}: {
  propertyId: string;
  initialFolderId?: string;
  correctsReportId?: string;
}) {
  return (
    <TenancyWorkspace
      key={`${propertyId}/${initialFolderId ?? ''}/${correctsReportId ?? ''}`}
      propertyId={propertyId}
      initialFolderId={initialFolderId}
      correctsReportId={correctsReportId}
    />
  );
}
function TenancyWorkspace({
  propertyId,
  initialFolderId,
  correctsReportId,
}: {
  propertyId: string;
  initialFolderId?: string;
  correctsReportId?: string;
}) {
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedFolder, setFolder] = useState<TenancyFolder | null>(null);
  const [create, setCreate] = useState(false);
  const [editing, setEditing] = useState<TenancyFolder | null>(null);
  const [draft, setDraft] = useState({ label: '', starts_on: '', ends_on: '' });
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [error, setError] = useState('');
  const [dateWarning, setDateWarning] = useState<{
    message: string;
    review: TenancyDateReview | null;
  } | null>(null);
  const [confirmedDates, setConfirmedDates] = useState(false);
  const [overlap, setOverlap] = useState<TenancyOverlap | null>(null);
  const [confirmedOverlap, setConfirmedOverlap] = useState(false);
  const [reportDirty, setReportDirty] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const [recordedCheckouts, setRecordedCheckouts] = useState<Set<string>>(
    () => new Set()
  );
  const invalidEnd =
    isInspectionDate(draft.starts_on) &&
    isInspectionDate(draft.ends_on) &&
    draft.ends_on < draft.starts_on;
  const [savedFolderId, setSavedFolderId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const folders = useRecords<InspectionPage<TenancyFolder>>(
    '/api/properties/' +
      propertyId +
      '/tenancies?' +
      (initialFolderId
        ? 'folder=' + encodeURIComponent(initialFolderId)
        : 'offset=' + page),
    revision
  );
  const folder = initialFolderId
    ? (folders.data?.items.find((item) => item.id === initialFolderId) ?? null)
    : selectedFolder;
  useEffect(() => {
    if (!savedFolderId || !folders.data || folders.loadedRevision !== revision)
      return;
    const saved = folders.data.items.find((item) => item.id === savedFolderId);
    if (saved) {
      setFolder(saved);
      setSavedFolderId(null);
    }
  }, [folders.data, folders.loadedRevision, revision, savedFolderId]);
  async function saveFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      saving.current ||
      reportSaving ||
      invalidEnd ||
      (reportDirty && !window.confirm(leavePrompt))
    )
      return;
    saving.current = true;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setSaveMessage('');
    try {
      const result = await inspectionRequest<{ id: string }>(
        '/api/properties/' + propertyId + '/tenancies',
        {
          label: String(form.get('label')),
          starts_on: String(form.get('starts_on')),
          ends_on: String(form.get('ends_on')) || null,
          ...(overlap && confirmedOverlap
            ? { overlap_token: overlap.token }
            : {}),
          ...(editing
            ? {
                id: editing.id,
                revision: editing.revision,
                ...(confirmedDates
                  ? { confirm_inspection_date_change: true }
                  : {}),
              }
            : {}),
        },
        undefined,
        editing ? 'PATCH' : 'POST'
      );
      if (!mounted.current) return;
      if (!result?.id)
        throw new Error(
          'The folder save was not confirmed. Reload folders before retrying.'
        );
      setCreate(false);
      setSavedFolderId(result.id);
      setSaveMessage(
        editing ? 'Tenancy folder changes saved.' : 'Tenancy folder created.'
      );
      setEditing(null);
      setDateWarning(null);
      setConfirmedDates(false);
      setOverlap(null);
      setConfirmedOverlap(false);
      if (!editing) setPage(0);
      setRevision((v) => v + 1);
    } catch (e) {
      if (!mounted.current) return;
      const conflict = inspectionOverlap(e);
      if (
        e instanceof InspectionRequestError &&
        e.code === 'TENANCY_DATE_CHANGE_EXCLUDES_INSPECTIONS'
      ) {
        setDateWarning({
          message: e.message,
          review: readTenancyDateReview(e.details),
        });
        setConfirmedDates(false);
      } else if (conflict) {
        setOverlap(conflict);
        setConfirmedOverlap(false);
      } else {
        setError(e instanceof Error ? e.message : 'Unable to save folder.');
      }
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function toggleFolderForm() {
    setError('');
    setDateWarning(null);
    setConfirmedDates(false);
    setOverlap(null);
    setConfirmedOverlap(false);
    setSaveMessage('');
    setEditing(null);
    setDraft({ label: '', starts_on: '', ends_on: '' });
    setCreate((v) => !v);
  }

  function updateFolderDate(field: 'starts_on' | 'ends_on', value: string) {
    setDateWarning(null);
    setConfirmedDates(false);
    setOverlap(null);
    setConfirmedOverlap(false);
    setDraft((v) => ({ ...v, [field]: value }));
  }
  return (
    <section
      className='rounded-xl border border-gray-200 bg-white p-5 text-gray-900'
      aria-labelledby='tenancy-folders-title'
    >
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h4 id='tenancy-folders-title' className='font-semibold'>
          Tenancy & inspections
        </h4>
        {folders.data?.canCreate &&
          !initialFolderId &&
          (!!folders.data.items.length || create) && (
            <button
              className={button}
              disabled={busy}
              onClick={toggleFolderForm}
              aria-expanded={create}
            >
              {create ? 'Cancel folder editing' : 'New tenancy folder'}
            </button>
          )}
      </div>
      <p className='mt-2 text-sm text-gray-600'>
        Keep check-in, routine and check-out reports together. Only current
        property members can open report links.
      </p>
      {saveMessage && (
        <p role='status' className='my-3 text-sm text-teal-800'>
          {saveMessage}
        </p>
      )}
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
          <fieldset disabled={busy} className='min-w-0 grid gap-3'>
            <legend className='font-semibold'>
              {editing ? 'Edit tenancy folder' : 'New tenancy folder'}
            </legend>
            <label className='text-sm'>
              Folder name
              <input
                value={draft.label}
                onChange={(e) =>
                  setDraft((v) => ({ ...v, label: e.target.value }))
                }
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
                  value={draft.starts_on}
                  onChange={(e) =>
                    updateFolderDate('starts_on', e.target.value)
                  }
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
                  value={draft.ends_on}
                  onChange={(e) => updateFolderDate('ends_on', e.target.value)}
                  name='ends_on'
                  type='date'
                  aria-invalid={invalidEnd || undefined}
                  aria-describedby={
                    invalidEnd ? 'tenancy-end-date-error' : undefined
                  }
                  className={control}
                />
              </label>
            </div>
            {invalidEnd && (
              <p
                id='tenancy-end-date-error'
                role='alert'
                className='text-sm text-red-800'
              >
                End date must be on or after{' '}
                {formatTenancyDate(draft.starts_on)}.
              </p>
            )}
            <p className='text-xs text-gray-600'>
              A folder records a tenancy period. It does not invite tenants or
              grant access.
            </p>
            {dateWarning && (
              <div className='rounded border border-amber-400 bg-amber-50 p-3 text-sm'>
                <p role='alert'>
                  {dateWarning.message} Saved reports keep their original
                  inspection dates.
                </p>
                {dateWarning.review && (
                  <ul className='my-2 list-disc pl-5'>
                    {dateWarning.review.reports.map((report) => (
                      <li key={report.id}>
                        {report.title} ·{' '}
                        {formatTenancyDate(report.inspected_on)}
                      </li>
                    ))}
                    {dateWarning.review.count >
                      dateWarning.review.reports.length && (
                      <li>
                        And{' '}
                        {dateWarning.review.count -
                          dateWarning.review.reports.length}{' '}
                        more.
                      </li>
                    )}
                  </ul>
                )}
                <label className='mt-2 flex items-center gap-2'>
                  <input
                    type='checkbox'
                    checked={confirmedDates}
                    onChange={(e) => setConfirmedDates(e.target.checked)}
                  />
                  Save these dates anyway
                </label>
              </div>
            )}
            {overlap && (
              <div className='rounded border border-amber-400 bg-amber-50 p-3 text-sm'>
                <p role='alert'>
                  These dates overlap{' '}
                  {overlap.count === 1
                    ? 'another tenancy'
                    : `${overlap.count} tenancies`}{' '}
                  on this property.
                </p>
                <ul className='my-2 list-disc pl-5'>
                  {overlap.folders.map((conflict) => (
                    <li key={conflict.id}>
                      {conflict.label} ·{' '}
                      {tenancyPeriodLabel(conflict.starts_on, conflict.ends_on)}
                    </li>
                  ))}
                </ul>
                {overlap.count > overlap.folders.length && (
                  <p>And {overlap.count - overlap.folders.length} more.</p>
                )}
                <label className='mt-2 flex items-center gap-2'>
                  <input
                    type='checkbox'
                    checked={confirmedOverlap}
                    onChange={(e) => setConfirmedOverlap(e.target.checked)}
                  />
                  This overlap is intentional
                </label>
              </div>
            )}
            <button
              disabled={
                busy ||
                reportSaving ||
                invalidEnd ||
                (!!dateWarning && !confirmedDates) ||
                (!!overlap && !confirmedOverlap)
              }
              className={button}
            >
              {busy
                ? 'Saving…'
                : editing
                  ? 'Save folder changes'
                  : 'Create folder'}
            </button>
          </fieldset>
        </form>
      )}
      {folders.data && (
        <>
          <div className='my-4 flex flex-wrap items-end gap-3'>
            <label className='min-w-0 flex-1 text-sm'>
              Tenancy folder
              <select
                disabled={busy || reportSaving || !!initialFolderId}
                className={control}
                value={folder?.id ?? ''}
                onChange={(e) => {
                  if (reportDirty && !window.confirm(leavePrompt)) return;
                  setFolder(
                    folders.data?.items.find((f) => f.id === e.target.value) ??
                      null
                  );
                }}
              >
                <option value=''>Choose a tenancy</option>
                {folders.data.items.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} · {tenancyStatus(f)} ·{' '}
                    {tenancyPeriodLabel(f.starts_on, f.ends_on)}
                    {f.check_out_recorded || recordedCheckouts.has(f.id)
                      ? ' · Check-out recorded'
                      : ''}
                  </option>
                ))}
              </select>
            </label>
            {page > 0 && (
              <button
                className='min-h-11 px-3 underline'
                disabled={busy || reportSaving}
                onClick={() => {
                  if (reportDirty && !window.confirm(leavePrompt)) return;
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
                disabled={busy || reportSaving}
                onClick={() => {
                  if (reportDirty && !window.confirm(leavePrompt)) return;
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
              disabled={busy || reportSaving}
              onClick={() => {
                setError('');
                setDateWarning(null);
                setConfirmedDates(false);
                setOverlap(null);
                setConfirmedOverlap(false);
                setSaveMessage('');
                setEditing(folder);
                setDraft({
                  label: folder.label,
                  starts_on: folder.starts_on,
                  ends_on: folder.ends_on ?? '',
                });
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
      {!folder && folders.data && (
        <>
          {folders.data.canCreate &&
            !folders.data.items.length &&
            !create &&
            !initialFolderId && (
              <button className={button} onClick={toggleFolderForm}>
                Create your first tenancy folder
              </button>
            )}
          <InspectionChoices disabled reason='Select a tenancy first' />
        </>
      )}
      {folder && folders.data && (
        <FolderReports
          key={`${folders.data.draftScope ?? ''}/${propertyId}/${folder.id}`}
          propertyId={propertyId}
          draftScope={folders.data.draftScope}
          folder={
            recordedCheckouts.has(folder.id)
              ? { ...folder, check_out_recorded: true }
              : folder
          }
          correctsReportId={correctsReportId}
          reportDirty={reportDirty}
          onDirtyChange={setReportDirty}
          onReportSaving={setReportSaving}
          onCheckoutRecorded={(id) =>
            setRecordedCheckouts((current) => new Set(current).add(id))
          }
        />
      )}
    </section>
  );
}
function InspectionChoices({
  disabled,
  reason,
  selected,
  onSelect,
}: {
  disabled?: boolean;
  reason?: string;
  selected?: InspectionKind;
  onSelect?: (kind: InspectionKind) => void;
}) {
  return (
    <div className='pw-stats' style={{ marginTop: 20, marginBottom: 16 }}>
      {INSPECTION_KINDS.map((kind) => (
        <button
          key={kind.value}
          type='button'
          className='pw-inspection-choice'
          disabled={disabled}
          aria-label={`Create ${kind.label} report`}
          aria-pressed={selected === kind.value}
          onClick={() => onSelect?.(kind.value)}
        >
          <strong>{kind.label}</strong>
          <span>{reason || 'Create report'}</span>
        </button>
      ))}
    </div>
  );
}
function FolderReports({
  propertyId,
  draftScope,
  folder,
  correctsReportId,
  reportDirty,
  onDirtyChange,
  onReportSaving,
  onCheckoutRecorded,
}: {
  propertyId: string;
  draftScope?: string;
  folder: TenancyFolder;
  correctsReportId?: string;
  reportDirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onReportSaving: (saving: boolean) => void;
  onCheckoutRecorded: (id: string) => void;
}) {
  const router = useRouter();
  const draftKey = inspectionDraftKey(
    draftScope,
    propertyId,
    folder.id,
    correctsReportId
  );
  const [draft, setDraft] = useState(() => readInspectionDraft(draftKey));
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [create, setCreate] = useState(!!correctsReportId);
  const [correctionId, setCorrectionId] = useState(correctsReportId);
  const [chosenKind, setKind] = useState<InspectionKind>(
    draft?.kind ?? 'check_in'
  );
  const [saving, setSaving] = useState(false);
  const original = useRecords<InspectionDetail>(
    correctionId
      ? '/api/properties/' +
          propertyId +
          '/inspections/' +
          encodeURIComponent(correctionId)
      : null,
    0
  );
  const correction =
    original.data?.report.folder_id === folder.id &&
    !original.data.report.corrected_by_report_id
      ? original.data
      : null;
  const kind = correction?.report.kind ?? chosenKind;
  const reports = useRecords<InspectionPage<InspectionReport>>(
    '/api/properties/' +
      propertyId +
      '/inspections?folder=' +
      folder.id +
      '&offset=' +
      page,
    revision
  );
  function closeForm() {
    if (reportDirty && !window.confirm(leavePrompt)) return;
    setCreate(false);
    setCorrectionId(undefined);
    if (correctsReportId) {
      router.replace(
        `/properties/${encodeURIComponent(propertyId)}/tenancies/${encodeURIComponent(folder.id)}`
      );
    }
  }
  function onSavingChange(value: boolean) {
    setSaving(value);
    onReportSaving(value);
  }
  function discardDraft() {
    if (
      !draftKey ||
      !window.confirm('Discard this tenancy’s inspection draft?')
    )
      return;
    if (writeInspectionDraft(draftKey, null)) {
      clearInspectionSaveRequest(draftKey);
      setDraft(null);
      setKind('check_in');
    }
  }
  return (
    <div className='border-t pt-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h5 className='font-semibold'>{folder.label}</h5>
          <p className='mt-1 text-sm text-gray-600'>
            {tenancyStatus(folder)} ·{' '}
            {tenancyPeriodLabel(folder.starts_on, folder.ends_on)}
          </p>
          {folder.check_out_recorded && (
            <p className='mt-1 text-sm font-semibold text-teal-900'>
              Check-out recorded
            </p>
          )}
        </div>
        {reports.data?.canCreate && (
          <div className='flex flex-wrap items-center gap-3'>
            <button
              className={button}
              disabled={saving}
              onClick={() => {
                if (create) closeForm();
                else {
                  setKind(draft?.kind ?? 'check_in');
                  setCreate(true);
                }
              }}
              aria-expanded={create}
            >
              {create
                ? 'Close inspection form'
                : draft
                  ? 'Resume draft'
                  : 'New inspection'}
            </button>
            {!create && draft && (
              <button className='min-h-11 underline' onClick={discardDraft}>
                Discard draft
              </button>
            )}
          </div>
        )}
      </div>
      <InspectionChoices
        disabled={
          !reports.data?.canCreate ||
          saving ||
          !!correctionId ||
          (!create && !!draft)
        }
        reason={
          reports.loading
            ? 'Loading reports…'
            : reports.error
              ? 'Retry loading reports first'
              : !reports.data?.canCreate
                ? 'Read-only access'
                : !create && draft
                  ? 'Resume or discard your draft first'
                  : undefined
        }
        selected={create ? kind : undefined}
        onSelect={(value) => {
          setKind(value);
          setCreate(true);
        }}
      />
      {create &&
        !!correctionId &&
        (original.loading ? (
          <p role='status'>Loading the report to correct…</p>
        ) : !correction ? (
          <p role='alert'>
            This report can’t be corrected here. Open the latest version in its
            tenancy folder.
          </p>
        ) : null)}
      {create && reports.data?.canCreate && (!correctionId || correction) && (
        <ReportForm
          propertyId={propertyId}
          folder={folder}
          correction={correction}
          draft={draft}
          draftKey={draftKey}
          onDraftChange={setDraft}
          kind={kind}
          onKindChange={setKind}
          onSavingChange={onSavingChange}
          onDirtyChange={onDirtyChange}
          cancel={closeForm}
          saved={(id) => {
            onSavingChange(false);
            setDraft(null);
            if (kind === 'check_out') onCheckoutRecorded(folder.id);
            setCreate(false);
            setCorrectionId(undefined);
            setPage(0);
            setRevision((v) => v + 1);
            if (correction) router.push(inspectionReportPath(propertyId, id));
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
            {report.corrected_by_report_id && (
              <Link
                className='text-sm text-teal-900 underline'
                href={inspectionReportPath(
                  propertyId,
                  report.corrected_by_report_id
                )}
              >
                Corrected · View correction
              </Link>
            )}
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
  folder,
  correction,
  draft,
  draftKey,
  onDraftChange,
  saved,
  kind,
  onKindChange,
  onSavingChange,
  onDirtyChange,
  cancel,
}: {
  propertyId: string;
  folder: TenancyFolder;
  correction: InspectionDetail | null;
  draft: InspectionDraft | null;
  draftKey: string | null;
  onDraftChange: (draft: InspectionDraft | null) => void;
  saved: (id: string) => void;
  kind: InspectionKind;
  onKindChange: (kind: InspectionKind) => void;
  onSavingChange: (saving: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
  cancel: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const photos = useRecords<{ photos: DatedRoomPhoto[] }>(
    '/api/properties/' + propertyId + '/room-photos',
    revision
  );
  const initial = correction?.report;
  const initialKind = useRef(kind);
  const [selected, setSelected] = useState<string[]>(
    () =>
      draft?.photoIds ??
      correction?.photos.flatMap((photo) =>
        photo.source_photo_id && photo.available ? [photo.source_photo_id] : []
      ) ??
      []
  );
  const [title, setTitle] = useState(draft?.title ?? initial?.title ?? '');
  const [inspectedOn, setInspectedOn] = useState(
    draft?.inspectedOn ?? initial?.inspected_on ?? ''
  );
  const [notes, setNotes] = useState(draft?.notes ?? initial?.notes ?? '');
  const [reason, setReason] = useState(
    draft?.reason ?? initial?.date_exception_reason ?? ''
  );
  const [noIssues, setNoIssues] = useState(
    draft?.noIssues ?? initial?.outcome === 'no_issues_found'
  );
  const [confirmedNoEvidence, setConfirmedNoEvidence] = useState(false);
  useEffect(() => setConfirmedNoEvidence(false), [kind, inspectedOn]);
  const needsEvidenceReview =
    kind !== 'routine' && !notes.trim() && !selected.length && !noIssues;
  const outcome = noIssues
    ? 'no_issues_found'
    : needsEvidenceReview && confirmedNoEvidence
      ? 'evidence_free'
      : null;
  const [serverDateWarning, setServerDateWarning] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const requiresSignIn = sessionEnded || photos.authRequired;
  const reauthHref = inspectionLoginHref(
    `/properties/${encodeURIComponent(propertyId)}/tenancies/${encodeURIComponent(folder.id)}` +
      (correction
        ? '?corrects=' + encodeURIComponent(correction.report.id)
        : '')
  );
  const availablePhotos = photos.data?.photos.filter(
    (photo) => !photo.deletion_pending
  );
  const unavailableSelections = availablePhotos
    ? selected.filter((id) => !availablePhotos.some((photo) => photo.id === id))
    : [];
  const exception =
    serverDateWarning ||
    isOutsideTenancy(inspectedOn, folder.starts_on, folder.ends_on);
  const [room, setRoom] = useState('other');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const requestId = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [error, setError] = useState('');
  const [recordedReportId, setRecordedReportId] = useState<string | null>(null);
  const initialPhotos =
    correction?.photos.flatMap((photo) =>
      photo.source_photo_id && photo.available ? [photo.source_photo_id] : []
    ) ?? [];
  const hasChanges =
    title !== (initial?.title ?? '') ||
    inspectedOn !== (initial?.inspected_on ?? '') ||
    notes !== (initial?.notes ?? '') ||
    reason !== (initial?.date_exception_reason ?? '') ||
    kind !== initialKind.current ||
    noIssues !== (initial?.outcome === 'no_issues_found') ||
    selected.length !== initialPhotos.length ||
    selected.some((id) => !initialPhotos.includes(id));
  const draftText = hasChanges
    ? JSON.stringify({
        title,
        inspectedOn,
        kind,
        notes,
        reason,
        photoIds: selected,
        noIssues,
      } satisfies InspectionDraft)
    : null;
  const [storedDraft, setStoredDraft] = useState<string | null>(null);
  useEffect(() => {
    if (!draftKey) return;
    if (writeInspectionDraft(draftKey, draftText)) {
      setStoredDraft(draftText);
      onDraftChange(
        draftText ? (JSON.parse(draftText) as InspectionDraft) : null
      );
    }
  }, [draftKey, draftText, onDraftChange]);
  const autosaved = !!draftText && draftText === storedDraft;
  const dirty = !!file || (hasChanges && !autosaved);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    function warnUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    function warnLink(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return;
      const link = event.target.closest('a[href]');
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === '_blank' ||
        link.hasAttribute('download') ||
        link.origin !== location.origin ||
        (link.pathname === location.pathname && link.search === location.search)
      )
        return;
      if (!window.confirm(leavePrompt)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener('beforeunload', warnUnload);
    document.addEventListener('click', warnLink, true);
    return () => {
      window.removeEventListener('beforeunload', warnUnload);
      document.removeEventListener('click', warnLink, true);
    };
  }, [dirty]);

  async function attachPhoto() {
    if (!file || uploading || busy || selected.length >= 50) return;
    setUploading(true);
    onSavingChange(true);
    setUploadError('');
    setUploadMessage('');
    try {
      const { ids } = await uploadRoomPhotos(propertyId, room, [file]);
      if (!mounted.current) return;
      setSelected((current) => [...current, ...ids]);
      setFile(null);
      if (input.current) input.current.value = '';
      setUploadMessage('Photo uploaded and selected for this report.');
      setRevision((value) => value + 1);
    } catch (e) {
      if (mounted.current) {
        if (inspectionAuthRequired(e)) setSessionEnded(true);
        setUploadError(
          e instanceof Error ? e.message : 'Could not upload the photo.'
        );
        setRevision((value) => value + 1);
      }
    } finally {
      if (mounted.current) {
        setUploading(false);
        onSavingChange(false);
      }
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      saving.current ||
      requiresSignIn ||
      uploading ||
      file ||
      unavailableSelections.length ||
      (exception && !reason.trim()) ||
      (needsEvidenceReview && !confirmedNoEvidence)
    )
      return;
    saving.current = true;
    setBusy(true);
    onSavingChange(true);
    setError('');
    try {
      requestId.current = inspectionSaveRequestId(draftKey, requestId.current);
      const result = await inspectionRequest<{ id: string }>(
        '/api/properties/' + propertyId + '/inspections',
        {
          folder_id: folder.id,
          title,
          kind,
          inspected_on: inspectedOn,
          notes,
          photo_ids: selected,
          request_id: requestId.current,
          ...(outcome ? { outcome } : {}),
          ...(correction ? { corrects_report_id: correction.report.id } : {}),
          ...(exception ? { date_exception_reason: reason.trim() } : {}),
        }
      );
      if (!result?.id)
        throw new Error(
          'The report save was not confirmed. Retry this draft to recover the result.'
        );
      if (draftKey && draftText) clearSavedInspectionDraft(draftKey, draftText);
      if (draftKey) clearInspectionSaveRequest(draftKey, requestId.current);
      if (!mounted.current) return;
      saved(result.id);
    } catch (e) {
      if (!mounted.current) return;
      if (inspectionAuthRequired(e)) setSessionEnded(true);
      if (
        e instanceof InspectionRequestError &&
        e.code === 'INSPECTION_OUTSIDE_TENANCY'
      )
        setServerDateWarning(true);
      if (
        e instanceof InspectionRequestError &&
        e.code === 'INSPECTION_SAVE_ALREADY_RECORDED'
      ) {
        const id = (e.details as { reportId?: string } | null)?.reportId;
        if (typeof id === 'string') setRecordedReportId(id);
      }
      setError(e instanceof Error ? e.message : 'Unable to save report.');
    } finally {
      saving.current = false;
      if (mounted.current) {
        setBusy(false);
        onSavingChange(false);
      }
    }
  }
  return (
    <form
      onSubmit={submit}
      className='my-4 grid gap-3 rounded-lg bg-gray-50 p-4'
    >
      <fieldset disabled={busy || uploading} className='min-w-0 grid gap-3'>
        {correction && (
          <legend className='font-semibold'>
            Correct {correction.report.title}
          </legend>
        )}
        <label className='text-sm'>
          Report title
          <input
            required
            maxLength={160}
            name='title'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={control}
          />
        </label>
        <div className='grid gap-3 sm:grid-cols-2'>
          <label className='text-sm'>
            Inspection type
            <select
              name='kind'
              className={control}
              value={kind}
              disabled={!!correction}
              onChange={(e) => onKindChange(e.target.value as InspectionKind)}
            >
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
              value={inspectedOn}
              onChange={(e) => {
                setInspectedOn(e.target.value);
                setServerDateWarning(false);
              }}
              aria-describedby='inspection-tenancy-dates'
              className={control}
            />
          </label>
        </div>
        <p id='inspection-tenancy-dates' className='text-sm text-gray-600'>
          Current tenancy dates · {folder.starts_on} to{' '}
          {folder.ends_on ?? 'no end date set'}
        </p>
        {exception && (
          <div className='rounded border border-amber-400 bg-amber-50 p-3'>
            <p role='status' className='text-sm'>
              This inspection date is outside the tenancy period. You can save
              it with a reason.
            </p>
            <label className='text-sm'>
              Reason for the date exception
              <textarea
                required
                name='date_exception_reason'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                rows={2}
                className={control}
              />
            </label>
          </div>
        )}
        <label className='text-sm'>
          Observations
          <textarea
            name='notes'
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setConfirmedNoEvidence(false);
            }}
            maxLength={10000}
            rows={4}
            className={control}
          />
        </label>
        <label className='flex items-center gap-2 text-sm'>
          <input
            type='checkbox'
            checked={noIssues}
            onChange={(e) => {
              setNoIssues(e.target.checked);
              setConfirmedNoEvidence(false);
            }}
          />
          No issues found
        </label>
        <fieldset>
          <legend className='text-sm font-semibold'>
            Room photos (up to 50)
          </legend>
          <p className='text-xs text-gray-600'>
            Upload a photo here or choose an existing room photo. Upload dates
            do not prove when photos were taken.
          </p>
          <div className='mt-3 grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]'>
            <label className='text-sm'>
              Room for new photo
              <select
                className={control}
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              >
                {ROOM_PHOTO_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className='text-sm'>
              Choose a photo
              <input
                ref={input}
                type='file'
                accept='image/jpeg,image/png,image/webp,image/gif'
                className={control}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type='button'
              className={button}
              disabled={!file || selected.length >= 50}
              onClick={attachPhoto}
            >
              {uploading ? 'Uploading…' : 'Upload and attach'}
            </button>
          </div>
          {uploadMessage && (
            <p role='status' className='mt-2 text-sm text-teal-900'>
              {uploadMessage}
            </p>
          )}
          {uploadError && (
            <p role='alert' className='mt-2 text-sm text-red-800'>
              {uploadError}
            </p>
          )}
          {photos.loading && <p role='status'>Loading photos…</p>}
          {photos.error && !photos.authRequired && (
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
            {availablePhotos?.map((photo) => (
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
                  onChange={(e) => {
                    setConfirmedNoEvidence(false);
                    setSelected((ids) =>
                      e.target.checked
                        ? [...ids, photo.id]
                        : ids.filter((id) => id !== photo.id)
                    );
                  }}
                />
                <span className='min-w-0 break-words'>
                  {photo.room_type.replace(/_/g, ' ')} · {photo.file_name}
                  <span className='block text-xs text-gray-600'>
                    {uploadedPhotoLabel(photo.created_at)}
                  </span>
                  {uploadedBeforeTenancy(
                    photo.created_at,
                    folder.starts_on
                  ) && (
                    <span className='block text-xs font-semibold text-amber-900'>
                      Uploaded before this tenancy
                    </span>
                  )}
                  {photo.attached_to_inspection && (
                    <span className='block text-xs text-gray-700'>
                      Used in a saved inspection
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {unavailableSelections.length > 0 && (
            <div className='my-2 text-sm text-red-800'>
              <p role='alert'>Some selected photos are no longer available.</p>
              <button
                type='button'
                className='min-h-11 underline'
                onClick={() =>
                  setSelected((current) =>
                    current.filter((id) => !unavailableSelections.includes(id))
                  )
                }
              >
                Remove unavailable photo selections
              </button>
            </div>
          )}
          {photos.data && !photos.data.photos.length && (
            <p className='text-sm'>
              No room photos yet. You can upload one above or save a written
              report.
            </p>
          )}
        </fieldset>
        {needsEvidenceReview && title.trim() && inspectedOn && (
          <div className='rounded border border-amber-400 bg-amber-50 p-3 text-sm'>
            <p role='status'>
              This report has no observations or photos. Saved reports cannot be
              edited.
            </p>
            <label className='mt-2 flex items-center gap-2'>
              <input
                type='checkbox'
                checked={confirmedNoEvidence}
                onChange={(e) => setConfirmedNoEvidence(e.target.checked)}
              />
              Save without observations or photos
            </label>
          </div>
        )}
        {error && (
          <p role='alert' className='text-sm text-red-800'>
            {error}
          </p>
        )}
        {recordedReportId && (
          <Link
            className='underline'
            href={inspectionReportPath(propertyId, recordedReportId)}
          >
            Open saved report
          </Link>
        )}
        <p className='text-xs text-gray-600'>
          Saving shares this report with existing property members. Saved
          reports stay in the audit trail. Corrections are linked as separate
          records. Attached photos are protected from deletion in Room Photos.
          {file && ' Upload the selected file before saving.'}
        </p>
        {autosaved && (
          <p className='text-sm text-teal-900'>Draft saved in this tab.</p>
        )}
        <button
          disabled={
            busy ||
            requiresSignIn ||
            uploading ||
            !!file ||
            !!unavailableSelections.length ||
            photos.loading ||
            !!photos.error ||
            (needsEvidenceReview && !confirmedNoEvidence) ||
            (exception && !reason.trim())
          }
          className={button}
        >
          {busy ? 'Saving…' : 'Save shared report'}
        </button>
        {requiresSignIn && (
          <div role='status' className='text-sm text-gray-700'>
            <a
              className='inline-flex min-h-11 items-center font-semibold text-teal-900 underline'
              href={reauthHref}
            >
              Sign in to continue
            </a>
            {autosaved && (
              <p>Sign back in on this tab to resume this tenancy’s draft.</p>
            )}
          </div>
        )}
        <button type='button' className='min-h-11 underline' onClick={cancel}>
          {autosaved ? 'Keep draft and close' : 'Cancel report'}
        </button>
      </fieldset>
    </form>
  );
}
