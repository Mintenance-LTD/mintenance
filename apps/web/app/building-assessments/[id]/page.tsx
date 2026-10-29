/**
 * Saved building survey with a separate, attributed inspection activity log.
 *
 * The only link out of Assessment History used to be `/correct`, which is a
 * YOLO detection-annotation tool: it draws bounding boxes over the frames so a
 * user can fix the model's training data. It never renders the survey. So a
 * homeowner clicking their own assessment could look at the photographs and
 * nothing else -- not the findings, not the diagnosis, not the RICS rating,
 * none of the reasoning that makes the survey worth keeping.
 *
 * The AI result remains unchanged by reported corrections and repair outcomes.
 * Legacy box corrections are available only when stored detections exist.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Camera, CalendarDays, ClipboardList } from 'lucide-react';
import { BuildingAssessmentDisplay } from '@/app/jobs/[id]/components/BuildingAssessmentDisplay';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import type { ObservationAssessment } from '@/lib/services/building-surveyor/observation-assessment';
import { InspectionActivity } from '@/components/building-surveyor/InspectionActivity';
import {
  assessmentPhotoCoverage,
  type AssessmentPhoto,
} from '@/lib/services/building-surveyor/photo-coverage';

export default function ViewAssessmentPage() {
  const params = useParams();
  const assessmentId = params?.id as string;

  const [assessment, setAssessment] = useState<
    Phase1BuildingAssessment | ObservationAssessment | null
  >(null);
  const [images, setImages] = useState<AssessmentPhoto[]>([]);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  // null = still loading. An assessment that has no result and one whose
  // request failed are different things and must not read the same.
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recaptureMessage, setRecaptureMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        setLoading(true);
        setError(null);
        setRecaptureMessage(null);

        const response = await fetch(
          `/api/assessments/${assessmentId}/status`,
          { signal: controller.signal, cache: 'no-store' }
        );
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'This survey could not be found.'
              : 'Failed to load this survey.'
          );
        }

        const data = await response.json();
        if (data.requiresRecapture)
          setRecaptureMessage(
            data.message ??
              'Retake clear, well-lit photos. Safety and condition have not been assessed.'
          );

        // `assessment.data` is the stored Phase1 payload -- verified against
        // the live rows, whose top-level keys match this type exactly.
        setAssessment(
          (data.assessment?.data as
            | Phase1BuildingAssessment
            | ObservationAssessment
            | undefined) ?? null
        );
        setImages(Array.isArray(data.images) ? data.images : []);
        setCreatedAt(data.createdAt ?? null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load this survey.'
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    if (assessmentId) void load();
    return () => controller.abort();
  }, [assessmentId]);

  // Frames in index order. Findings carry a sourceFrameIndex into this list, so
  // position is the contract -- a gap or a reorder would pair a finding with
  // the wrong photograph, which is worse than showing none.
  const { frames: frameUrls, recordedIds } = assessmentPhotoCoverage(
    assessment,
    images
  );

  return (
    <div className='mx-auto w-full max-w-7xl py-6 sm:py-8'>
      <div className='min-w-0'>
        <Link
          href='/properties'
          className='mb-6 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-gray-600 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700'
        >
          <ArrowLeft className='w-4 h-4' aria-hidden='true' />
          Back to properties
        </Link>

        <header className='mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-gray-200 pb-7'>
          <div>
            <p className='mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-teal-700'>
              <ClipboardList size={16} aria-hidden='true' /> Property record
            </p>
            <h1 className='text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl'>
              Survey
            </h1>
            <p className='mt-3 max-w-xl text-sm leading-6 text-gray-600'>
              Your saved findings, supporting photos and a record of what
              happens next.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-3 text-sm text-gray-600'>
            {createdAt && (
              <span className='inline-flex items-center gap-2'>
                <CalendarDays size={16} aria-hidden='true' />
                {new Date(createdAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            {!loading && !error && (
              <span className='inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5'>
                <Camera size={16} aria-hidden='true' />
                {images.length} attached photos
              </span>
            )}
          </div>
        </header>

        {recaptureMessage && (
          <div
            role='alert'
            className='mb-6 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6'
          >
            <span className='rounded-xl bg-white p-3 text-amber-800'>
              <Camera size={22} aria-hidden='true' />
            </span>
            <div>
              <h2 className='text-lg font-semibold text-amber-950'>
                New photos needed
              </h2>
              <p className='mt-1 max-w-3xl text-sm leading-6 text-amber-900'>
                {recaptureMessage}
              </p>
              <p className='mt-2 text-sm text-amber-900'>
                Photos added below are kept as follow-up evidence. They do not
                change the original assessment.
              </p>
            </div>
          </div>
        )}

        {loading && <p className='text-gray-600'>Loading survey…</p>}

        {!loading && error && (
          <div className='rounded-lg border border-amber-200 bg-amber-50 p-4'>
            <p className='text-sm text-amber-900'>{error}</p>
          </div>
        )}

        {!loading && !error && !assessment && !recaptureMessage && (
          <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
            <p className='text-sm text-gray-700'>
              This survey has no results to show yet.
            </p>
          </div>
        )}

        {!loading && !error && assessment && (
          <>
            <p className='mb-4 rounded bg-gray-50 p-3 text-sm'>
              {recordedIds
                ? `AI assessed ${recordedIds.length} photos from this survey. ${images.filter((image) => !recordedIds.includes(image.id)).length} attached photos were not included in that run.`
                : 'This older survey does not record exactly which attached photos the AI used.'}
            </p>
            <BuildingAssessmentDisplay
              assessment={assessment}
              photoUrls={frameUrls.filter(Boolean)}
              frameUrls={frameUrls}
            />

            {images.length > 0 && (
              <div className='mt-8'>
                <h2 className='text-sm font-semibold text-gray-900 mb-3'>
                  Attached photos ({images.length})
                </h2>
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2'>
                  {images.map((image, index) => (
                    <figure key={image.id}>
                      {image.image_url ? (
                        // Signed Supabase URLs are not a configured next/image
                        // remote pattern, and they expire — optimisation would
                        // cache a dead asset.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image.image_url}
                          alt={`Assessment source photo ${(image.image_index ?? index) + 1}`}
                          className='w-full aspect-square object-cover rounded-lg border border-gray-200'
                        />
                      ) : (
                        <p>Photo unavailable</p>
                      )}
                      <figcaption className='text-xs mt-1'>
                        Photo {(image.image_index ?? index) + 1}
                        {recordedIds
                          ? recordedIds.includes(image.id)
                            ? ' · Used by AI'
                            : ' · Not assessed in this run'
                          : ''}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}

            {!('protocol' in assessment) &&
              Boolean(assessment.evidence?.roboflowDetections?.length) && (
                <div className='mt-8 pt-4 border-t border-gray-200'>
                  <Link
                    href={`/building-assessments/${assessmentId}/correct`}
                    className='text-xs font-semibold text-gray-500 hover:text-gray-700'
                  >
                    Correct the AI’s detections →
                  </Link>
                </div>
              )}
          </>
        )}
        {!loading && !error && (assessment || recaptureMessage) && (
          <InspectionActivity
            key={assessmentId}
            assessmentId={assessmentId}
            onPhotosChanged={setImages}
          />
        )}
      </div>
    </div>
  );
}
