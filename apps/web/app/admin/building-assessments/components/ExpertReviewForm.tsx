'use client';

import { useEffect, useState } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { Button } from '@/components/ui/Button';
import type { ReviewLabels } from '@/lib/services/building-surveyor/evaluation/review-contract';

interface ReviewSource {
  sourceFingerprint: string;
  images: Array<{ id: string; imageIndex: number; url: string }>;
  reviews: Array<{
    id: string;
    created_at: string;
    reviewer_id: string;
    source_fingerprint: string;
    labels: ReviewLabels;
    notes: string;
    expertise: string;
  }>;
}
const initialLabels: ReviewLabels = {
  evidence: 'sufficient',
  damageType: null,
  severity: null,
  urgency: null,
  criticalHazard: null,
};

export function ExpertReviewForm({ assessmentId }: { assessmentId: string }) {
  const [source, setSource] = useState<ReviewSource | null>(null);
  const [labels, setLabels] = useState<ReviewLabels>(initialLabels);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [expertise, setExpertise] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setSource(null);
    fetch(`/api/admin/building-assessments/${assessmentId}/expert-review`, {
      signal: abort.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            'Unable to load review evidence. Check your admin access and the database migration.'
          );
        return response.json();
      })
      .then(setSource)
      .catch((error) => {
        if (!abort.signal.aborted) setMessage(error.message);
      });
    return () => abort.abort();
  }, [assessmentId, reload]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!source || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/admin/building-assessments/${assessmentId}/expert-review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getCsrfHeaders()),
          },
          body: JSON.stringify({
            sourceFingerprint: source.sourceFingerprint,
            labels,
            notes,
            expertise,
            evidenceImageIds: photos,
            confirmedIndependentReview: confirmed,
          }),
        }
      );
      if (!response.ok) {
        if (response.status === 409)
          throw new Error(
            'The source changed. Reload the evidence and check your labels before saving again.'
          );
        if (response.status === 403)
          throw new Error(
            'Admin verification is required. Complete your MFA verification and try again.'
          );
        throw new Error(
          'Review was not saved. Check all required fields and try again.'
        );
      }
      setMessage('Review saved. Earlier revisions remain in the history.');
      setConfirmed(false);
      setReload((value) => value + 1);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Review was not saved.'
      );
    } finally {
      setBusy(false);
    }
  }
  const fieldClass =
    'block w-full rounded border border-gray-300 p-2 mt-1 bg-white text-gray-900';
  return (
    <section
      className='mt-6 border-t pt-6 space-y-4'
      aria-label='Expert reference review'
    >
      <h3 className='text-lg font-semibold'>Expert reference review</h3>
      <p className='text-sm text-gray-600'>
        Assess the primary visible defect from the photos. Use “none” when no
        defect is visible. Choose insufficient evidence when a judgement cannot
        be made. This records a reference label; it does not certify the
        building or add data to model training.
      </p>
      <p role='status' aria-live='polite'>
        {message}
      </p>
      {!source ? (
        <Button variant='outline' onClick={() => setReload((v) => v + 1)}>
          Reload review evidence
        </Button>
      ) : (
        <>
          {source.images.length === 0 ? (
            <p>
              No source photos are available. A reference review cannot be
              saved.
            </p>
          ) : (
            <form onSubmit={save} className='space-y-4'>
              <fieldset>
                <legend className='font-medium'>
                  Select the photos you inspected
                </legend>
                <div className='grid grid-cols-2 gap-3'>
                  {source.images.map((image, index) => (
                    <label key={image.id} className='border rounded p-2'>
                      <a
                        href={image.url}
                        target='_blank'
                        rel='noreferrer'
                        className='underline'
                      >
                        Open photo {index + 1}
                      </a>
                      {/* Signed storage URLs are renewed by the admin endpoint. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={`Assessment source photo ${index + 1}`}
                        className='h-40 w-full object-contain'
                      />
                      <input
                        type='checkbox'
                        checked={photos.includes(image.id)}
                        onChange={(e) =>
                          setPhotos((old) =>
                            e.target.checked
                              ? [...old, image.id]
                              : old.filter((id) => id !== image.id)
                          )
                        }
                      />{' '}
                      Inspected photo {index + 1}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className='block'>
                Evidence quality
                <select
                  className={fieldClass}
                  value={labels.evidence}
                  onChange={(e) =>
                    setLabels({
                      ...initialLabels,
                      evidence: e.target.value as ReviewLabels['evidence'],
                    })
                  }
                >
                  <option value='sufficient'>
                    Sufficient for a visual judgement
                  </option>
                  <option value='insufficient'>Insufficient evidence</option>
                </select>
              </label>
              {labels.evidence === 'sufficient' && (
                <div className='grid gap-4 sm:grid-cols-2'>
                  <label>
                    Primary defect category
                    <input
                      required
                      maxLength={120}
                      className={fieldClass}
                      placeholder='e.g. water_damage, electrical_fault, none'
                      value={labels.damageType ?? ''}
                      onChange={(e) =>
                        setLabels({ ...labels, damageType: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Severity
                    <select
                      required
                      className={fieldClass}
                      value={labels.severity ?? ''}
                      onChange={(e) =>
                        setLabels({
                          ...labels,
                          severity: e.target.value as ReviewLabels['severity'],
                        })
                      }
                    >
                      <option value=''>Choose severity</option>
                      {[
                        'none',
                        'early',
                        'developing',
                        'significant',
                        'dangerous',
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Urgency
                    <select
                      required
                      className={fieldClass}
                      value={labels.urgency ?? ''}
                      onChange={(e) =>
                        setLabels({
                          ...labels,
                          urgency: e.target.value as ReviewLabels['urgency'],
                        })
                      }
                    >
                      <option value=''>Choose urgency</option>
                      {[
                        'immediate',
                        'urgent',
                        'soon',
                        'planned',
                        'monitor',
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Critical hazard visible?
                    <select
                      required
                      className={fieldClass}
                      value={
                        labels.criticalHazard === null
                          ? ''
                          : String(labels.criticalHazard)
                      }
                      onChange={(e) =>
                        setLabels({
                          ...labels,
                          criticalHazard:
                            e.target.value === ''
                              ? null
                              : e.target.value === 'true',
                        })
                      }
                    >
                      <option value=''>Choose judgement</option>
                      <option value='true'>Yes</option>
                      <option value='false'>No</option>
                    </select>
                  </label>
                </div>
              )}
              <label className='block'>
                Your relevant qualification or experience
                <input
                  required
                  minLength={3}
                  maxLength={200}
                  className={fieldClass}
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                />
              </label>
              <label className='block'>
                Evidence and reasoning
                <textarea
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={3}
                  className={fieldClass}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder='Describe visible evidence, missed defects, false alarms or why the photos are insufficient.'
                />
              </label>
              <label className='block'>
                <input
                  required
                  type='checkbox'
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />{' '}
                I inspected the selected photos and these labels reflect my own
                judgement.
              </label>
              <Button
                type='submit'
                disabled={busy || photos.length === 0 || !confirmed}
              >
                {busy ? 'Saving review…' : 'Save expert review'}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setPhotos([]);
                  setConfirmed(false);
                  setReload((v) => v + 1);
                }}
              >
                Reload evidence
              </Button>
            </form>
          )}
          <details>
            <summary>
              Review history ({source.reviews.length}
              {source.reviews.length === 100 ? '+' : ''})
            </summary>
            {source.reviews.map((review) => (
              <article
                className='my-3 border p-3 rounded text-sm'
                key={review.id}
              >
                <p>
                  {new Date(review.created_at).toLocaleString()} ·{' '}
                  {review.expertise}
                </p>
                <p>
                  {review.source_fingerprint !== source.sourceFingerprint
                    ? 'Earlier source version · '
                    : ''}
                  {review.labels.evidence === 'insufficient'
                    ? 'Insufficient evidence'
                    : `${review.labels.damageType} · ${review.labels.severity} · ${review.labels.urgency} · Critical hazard: ${review.labels.criticalHazard ? 'yes' : 'no'}`}
                </p>
                <p>{review.notes}</p>
              </article>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
