'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
      className='mt-8 rounded-xl border border-gray-200 bg-white p-6 space-y-4'
      aria-labelledby='inspection-activity-title'
    >
      <h2 id='inspection-activity-title' className='text-xl font-semibold'>
        Survey activity
      </h2>
      <p className='text-sm text-gray-600'>
        Record a correction, work carried out or what changed afterwards. These
        reports stay separate from the AI findings and independent expert
        reviews.
      </p>
      {loading && <p role='status'>Loading activity…</p>}
      {error && (
        <p role='alert' className='text-red-700'>
          {error}
        </p>
      )}
      {message && (
        <p role='status' className='text-teal-800'>
          {message}
        </p>
      )}
      <button
        type='button'
        disabled={busy || loading}
        onClick={() => void refresh()}
        className='text-sm underline'
      >
        Reload photos and activity
      </button>
      {source && (
        <form onSubmit={save}>
          <fieldset disabled={busy} className='space-y-4'>
            <legend className='font-semibold mb-3'>Add activity</legend>
            <label className='block'>
              Activity type
              <select
                className='block w-full border rounded p-2'
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
            <label className='block'>
              Date observed or work completed
              <input
                required
                className='block border rounded p-2'
                type='date'
                value={occurredOn}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setOccurredOn(event.target.value)}
              />
            </label>
            {kind !== 'repair' && (
              <label className='block'>
                Reported outcome
                <select
                  required
                  className='block w-full border rounded p-2'
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
            <label className='block'>
              Details
              <textarea
                required
                minLength={10}
                maxLength={4000}
                rows={4}
                className='block w-full border rounded p-2'
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                aria-describedby='activity-detail-help'
              />
            </label>
            <p id='activity-detail-help' className='text-sm text-gray-600'>
              {kind === 'repair'
                ? 'Describe the work, who carried it out and any cause established on site. Say when the cause is still unknown.'
                : 'Describe the visible evidence, where it is and what differs from the original findings. Keep unknown causes separate from observations.'}
            </p>
            <fieldset>
              <legend className='font-medium'>
                Evidence photos{' '}
                {kind === 'repair' ? '(optional)' : '(select at least one)'}
              </legend>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2'>
                {source.images.map((image, index) => (
                  <label key={image.id} className='border rounded p-2'>
                    {image.url ? (
                      <>
                        {/* Private signed URLs must not be cached by image optimisation. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt={`Activity evidence photo ${(image.imageIndex ?? index) + 1}`}
                          className='w-full h-32 object-contain'
                        />
                      </>
                    ) : (
                      <p>Photo unavailable</p>
                    )}
                    <input
                      type='checkbox'
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
            <label className='block'>
              Add follow-up photos
              <input
                ref={uploadInput}
                className='block mt-1'
                type='file'
                multiple
                accept='image/jpeg,image/png,image/webp'
                onChange={(event) => void upload(event.target.files)}
              />
            </label>
            <p className='text-sm text-gray-600'>
              Add a wider view and a clear close-up from the same angle where
              possible. Up to 12 photos, 8 MB each. Adding photos does not rerun
              the original assessment.
            </p>
            <button
              className='rounded bg-teal-700 text-white px-4 py-2'
              type='submit'
            >
              {busy ? 'Saving…' : 'Save reported activity'}
            </button>
          </fieldset>
        </form>
      )}
      {source && (
        <div className='space-y-3'>
          <h3 className='font-semibold'>Activity history</h3>
          {!source.events.length && (
            <p className='text-gray-600'>No activity recorded yet.</p>
          )}
          {source.hasMore && <p>Showing the latest 100 entries.</p>}
          {source.events.map((event) => (
            <article key={event.id} className='border-t pt-3 space-y-1'>
              <h4 className='font-semibold'>
                {activityLabels[event.kind]} · {event.occurred_on}
              </h4>
              <p className='text-sm text-gray-600'>
                Reported by{' '}
                {event.actor_role === 'admin'
                  ? 'an administrator'
                  : 'the assessment owner'}{' '}
                · recorded {new Date(event.created_at).toLocaleString('en-GB')}
              </p>
              {event.outcome && <p>{inspectionOutcomeLabels[event.outcome]}</p>}
              <p className='whitespace-pre-wrap'>{event.notes}</p>
              <p className='text-sm'>
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
                <p className='text-sm text-gray-600'>
                  Recorded against an earlier assessment or photo set.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
