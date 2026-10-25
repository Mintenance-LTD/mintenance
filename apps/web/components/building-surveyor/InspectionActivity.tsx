'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, History, Plus, RefreshCw, Upload } from 'lucide-react';
import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  inspectionEventSchema,
  inspectionOutcomeLabels,
  type InspectionEvent,
  type InspectionEventInput,
} from '@/lib/services/building-surveyor/inspection-events';
import type { AssessmentPhoto } from '@/lib/services/building-surveyor/photo-coverage';

interface Source {
  sourceFingerprint: string;
  images: { id: string; imageIndex: number | null; url: string | null }[];
  events: InspectionEvent[];
  hasMore: boolean;
}
const activityLabels = {
  correction: 'Correction to the observations',
  repair: 'Repair carried out',
  follow_up: 'Follow-up observation',
};

function apiMessage(
  result: { error?: string | { message?: string } },
  fallback: string
) {
  return typeof result.error === 'string'
    ? result.error
    : (result.error?.message ?? fallback);
}

export function InspectionActivity({
  assessmentId,
  onPhotosChanged,
}: {
  assessmentId: string;
  onPhotosChanged?: (images: AssessmentPhoto[]) => void;
}) {
  const [source, setSource] = useState<Source | null>(null);
  const [kind, setKind] = useState<InspectionEventInput['kind']>('correction');
  const [outcome, setOutcome] = useState('');
  const [occurredOn, setOccurredOn] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const retry = useRef<{ body: string; id: string } | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(
        `/api/assessments/${assessmentId}/activity`,
        { signal, cache: 'no-store' }
      );
      if (!response.ok)
        throw new Error('Unable to load survey activity. Try again.');
      const next: Source = await response.json();
      setSource(next);
      onPhotosChanged?.(
        next.images.map((image) => ({
          id: image.id,
          image_url: image.url,
          image_index: image.imageIndex,
        }))
      );
      setSelected((ids) =>
        ids.filter((id) => next.images.some((image) => image.id === id))
      );
      return next;
    },
    [assessmentId, onPhotosChanged]
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .catch((err) => {
        if (!controller.signal.aborted) setError((err as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [load]);

  async function refresh() {
    setBusy(true);
    setError('');
    try {
      await load();
      setMessage('Photos refreshed. Check your selection before saving.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!source || busy) return;
    setError('');
    setMessage('');
    const details = {
      sourceFingerprint: source.sourceFingerprint,
      kind,
      occurredOn,
      notes: notes.trim(),
      evidenceImageIds: selected,
      outcome: kind === 'repair' ? null : outcome,
    };
    const body = JSON.stringify(details);
    if (retry.current?.body !== body)
      retry.current = { body, id: crypto.randomUUID() };
    const parsed = inspectionEventSchema.safeParse({
      ...details,
      requestId: retry.current.id,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Complete all fields');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/assessments/${assessmentId}/activity`,
        {
          method: 'POST',
          headers: {
            ...(await getCsrfHeaders()),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(parsed.data),
        }
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(apiMessage(result, 'Unable to save activity'));
      setSource((current) =>
        current
          ? {
              ...current,
              events: [
                result.event,
                ...current.events.filter((row) => row.id !== result.event.id),
              ].slice(0, 100),
            }
          : current
      );
      setNotes('');
      setSelected([]);
      setOutcome('');
      retry.current = null;
      setMessage(
        'Activity saved as a reported observation. Expert verification is separate.'
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | null) {
    if (!files?.length || !source || busy) return;
    if (
      files.length > 12 ||
      Array.from(files).some((file) => file.size > 8 * 1024 * 1024)
    ) {
      setError('Choose up to 12 photos, each no larger than 8 MB.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const form = new FormData();
      form.set('assessmentId', assessmentId);
      for (const file of Array.from(files)) form.append('photos', file);
      const headers = await getCsrfHeaders();
      const uploaded = await fetch('/api/assessments/photo-upload', {
        method: 'POST',
        headers,
        body: form,
      });
      const result = await uploaded.json();
      if (!uploaded.ok)
        throw new Error(apiMessage(result, 'Photo upload failed'));
      const attached = await fetch(`/api/assessments/${assessmentId}/images`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: result.urls }),
      });
      if (!attached.ok)
        throw new Error(
          'Photos uploaded but could not be attached. Reload photos before trying again.'
        );
      await load();
      setMessage(
        result.skipped?.length
          ? 'Some photos could not be uploaded. Check the photos below and select the evidence for this activity.'
          : 'Photos added. Select the evidence for this activity. The original AI assessment has not been rerun.'
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (uploadInput.current) uploadInput.current.value = '';
    }
  }
  const choices =
    kind === 'correction'
      ? ([
          'visible_defect',
          'no_visible_defect',
          'insufficient_evidence',
        ] as const)
      : (['resolved', 'improved', 'unchanged', 'worse', 'unknown'] as const);
  return (
    <section
      className='mt-8 space-y-5'
      aria-labelledby='inspection-activity-title'
    >
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='max-w-2xl'>
          <h2
            id='inspection-activity-title'
            className='text-2xl font-semibold tracking-tight text-gray-900'
          >
            Survey activity
          </h2>
          <p className='mt-2 text-sm leading-6 text-gray-600'>
            Record a correction, work carried out or what changed afterwards.
            These reports stay separate from the AI findings and independent
            expert reviews.
          </p>
        </div>
        <button
          type='button'
          disabled={busy || loading}
          onClick={() => void refresh()}
          className='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 disabled:opacity-50'
        >
          <RefreshCw size={15} aria-hidden='true' /> Reload photos and activity
        </button>
      </div>
      {loading && <p role='status'>Loading activity…</p>}
      {error && (
        <p
          role='alert'
          className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800'
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role='status'
          className='rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800'
        >
          {message}
        </p>
      )}
      <div className='grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'>
        {source && (
          <form
            onSubmit={save}
            className='min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6'
          >
            <fieldset disabled={busy} className='space-y-5'>
              <legend className='mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900'>
                <Plus size={20} className='text-teal-700' aria-hidden='true' />
                Add activity
              </legend>
              <div className='grid gap-4 sm:grid-cols-2'>
                <label className='block text-sm font-medium text-gray-700'>
                  Activity type
                  <select
                    className='mt-2 block min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-normal focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20'
                    value={kind}
                    onChange={(event) => {
                      setKind(event.target.value as typeof kind);
                      setOutcome('');
                    }}
                  >
                    {Object.entries(activityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className='block text-sm font-medium text-gray-700'>
                  Date observed or work completed
                  <input
                    required
                    className='mt-2 block min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-normal focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20'
                    type='date'
                    value={occurredOn}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setOccurredOn(event.target.value)}
                  />
                </label>
              </div>
              {kind !== 'repair' && (
                <label className='block text-sm font-medium text-gray-700'>
                  Reported outcome
                  <select
                    required
                    className='mt-2 block min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-normal focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20'
                    value={outcome}
                    onChange={(event) => setOutcome(event.target.value)}
                  >
                    <option value=''>Choose an outcome</option>
                    {choices.map((value) => (
                      <option key={value} value={value}>
                        {inspectionOutcomeLabels[value]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className='block text-sm font-medium text-gray-700'>
                Details
                <textarea
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={4}
                  className='mt-2 block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-normal leading-6 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20'
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  aria-describedby='activity-detail-help'
                />
              </label>
              <p
                id='activity-detail-help'
                className='text-xs leading-5 text-gray-600'
              >
                {kind === 'repair'
                  ? 'Describe the work, who carried it out and any cause established on site. Say when the cause is still unknown.'
                  : 'Describe the visible evidence, where it is and what differs from the original findings. Keep unknown causes separate from observations.'}
              </p>
              <fieldset>
                <legend className='text-sm font-medium text-gray-700'>
                  Evidence photos{' '}
                  {kind === 'repair' ? '(optional)' : '(select at least one)'}
                </legend>
                <p className='mt-1 text-xs text-gray-500'>
                  {selected.length} selected for this report
                </p>
                {!source.images.length && (
                  <div className='mt-3 rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-600'>
                    <Camera
                      size={24}
                      className='mx-auto mb-2 text-gray-400'
                      aria-hidden='true'
                    />
                    No evidence photos yet. Add photos below to support your
                    report.
                  </div>
                )}
                <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2'>
                  {source.images.map((image, index) => (
                    <label
                      key={image.id}
                      className={`cursor-pointer overflow-hidden rounded-xl border p-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-teal-600 ${selected.includes(image.id) ? 'border-teal-600 bg-teal-50' : 'border-gray-200 bg-gray-50 hover:border-teal-400'}`}
                    >
                      {image.url ? (
                        <>
                          {/* Private signed URLs must not be cached by image optimisation. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.url}
                            alt={`Activity evidence photo ${(image.imageIndex ?? index) + 1}`}
                            className='mb-2 h-28 w-full rounded-lg object-contain sm:h-32'
                          />
                        </>
                      ) : (
                        <p>Photo unavailable</p>
                      )}
                      <input
                        type='checkbox'
                        className='h-4 w-4 rounded accent-teal-700 align-middle'
                        disabled={!image.url}
                        checked={selected.includes(image.id)}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, image.id]
                              : current.filter((id) => id !== image.id)
                          )
                        }
                      />{' '}
                      Photo {(image.imageIndex ?? index) + 1}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className='rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4'>
                <label className='block text-sm font-medium text-gray-800'>
                  <span className='flex items-center gap-2'>
                    <Upload
                      size={17}
                      className='text-teal-700'
                      aria-hidden='true'
                    />
                    Add follow-up photos
                  </span>
                  <input
                    ref={uploadInput}
                    className='mt-3 block w-full min-w-0 text-xs text-gray-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-teal-700 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white hover:file:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700'
                    type='file'
                    multiple
                    accept='image/jpeg,image/png,image/webp'
                    onChange={(event) => void upload(event.target.files)}
                  />
                </label>
                <p className='mt-3 text-xs leading-5 text-gray-600'>
                  Add a wider view and a clear close-up from the same angle
                  where possible. Up to 12 photos, 8 MB each. Adding photos does
                  not rerun the original assessment.
                </p>
              </div>
              <button
                className='inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50 sm:w-auto'
                type='submit'
              >
                {busy ? 'Saving…' : 'Save reported activity'}
              </button>
            </fieldset>
          </form>
        )}
        {source && (
          <div className='min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6'>
            <h3 className='mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900'>
              <History size={20} className='text-teal-700' aria-hidden='true' />
              Activity history
            </h3>
            {!source.events.length && (
              <p className='rounded-xl bg-gray-50 p-5 text-sm leading-6 text-gray-600'>
                No activity recorded yet.
              </p>
            )}
            {source.hasMore && <p>Showing the latest 100 entries.</p>}
            {source.events.map((event) => (
              <article
                key={event.id}
                className='relative mb-6 space-y-2 border-l-2 border-teal-100 pl-4 last:mb-0'
              >
                <h4 className='text-sm font-semibold leading-6 text-gray-900'>
                  {activityLabels[event.kind]} · {event.occurred_on}
                </h4>
                <p className='text-xs leading-5 text-gray-500'>
                  Reported by{' '}
                  {event.actor_role === 'admin'
                    ? 'an administrator'
                    : 'the assessment owner'}{' '}
                  · recorded{' '}
                  {new Date(event.created_at).toLocaleString('en-GB')}
                </p>
                {event.outcome && (
                  <p className='inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700'>
                    {inspectionOutcomeLabels[event.outcome]}
                  </p>
                )}
                <p className='whitespace-pre-wrap break-words text-sm leading-6 text-gray-700'>
                  {event.notes}
                </p>
                <p className='text-xs font-medium text-gray-600'>
                  Evidence:{' '}
                  {event.evidence_image_ids.length
                    ? event.evidence_image_ids
                        .map((id) => {
                          const index = source.images.findIndex(
                            (image) => image.id === id
                          );
                          return index < 0
                            ? 'photo no longer available'
                            : `Photo ${(source.images[index].imageIndex ?? index) + 1}`;
                        })
                        .join(', ')
                    : 'No photos linked'}
                </p>
                {event.source_fingerprint !== source.sourceFingerprint && (
                  <p className='text-xs leading-5 text-gray-500'>
                    Recorded against an earlier assessment or photo set.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
