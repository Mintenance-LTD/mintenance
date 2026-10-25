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
import { ArrowLeft } from 'lucide-react';
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
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-4xl mx-auto'>
        {recaptureMessage && (
          <div
            role='alert'
            className='mb-4 rounded border border-amber-300 bg-amber-50 p-4'
          >
            <h2 className='font-semibold'>New photos needed</h2>
            <p>{recaptureMessage}</p>
          </div>
        )}
        <Link
          href='/properties'
          className='inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4'
        >
          <ArrowLeft className='w-4 h-4' />
          Back to properties
        </Link>

        <div className='flex flex-wrap items-baseline justify-between gap-2 mb-6'>
          <h1 className='text-2xl font-bold text-gray-900'>Survey</h1>
          {createdAt && (
            <span className='text-sm text-gray-500'>
              {new Date(createdAt).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>

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
