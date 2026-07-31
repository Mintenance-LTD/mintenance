/**
 * Read-only view of a saved building survey.
 *
 * The only link out of Assessment History used to be `/correct`, which is a
 * YOLO detection-annotation tool: it draws bounding boxes over the frames so a
 * user can fix the model's training data. It never renders the survey. So a
 * homeowner clicking their own assessment could look at the photographs and
 * nothing else -- not the findings, not the diagnosis, not the RICS rating,
 * none of the reasoning that makes the survey worth keeping.
 *
 * This is the page that shows the survey. Correcting detections stays available
 * as a secondary action for anyone who actually wants to retrain the model.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { BuildingAssessmentDisplay } from '@/app/jobs/[id]/components/BuildingAssessmentDisplay';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';

interface AssessmentImage {
  image_url: string;
  image_index?: number | null;
}

export default function ViewAssessmentPage() {
  const params = useParams();
  const assessmentId = params?.id as string;

  const [assessment, setAssessment] = useState<Phase1BuildingAssessment | null>(
    null
  );
  const [images, setImages] = useState<AssessmentImage[]>([]);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  // null = still loading. An assessment that has no result and one whose
  // request failed are different things and must not read the same.
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/assessments/${assessmentId}/status`);
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'This survey could not be found.'
              : 'Failed to load this survey.'
          );
        }

        const data = await response.json();

        // `assessment.data` is the stored Phase1 payload -- verified against
        // the live rows, whose top-level keys match this type exactly.
        setAssessment(
          (data.assessment?.data as Phase1BuildingAssessment | undefined) ??
            null
        );
        setImages(Array.isArray(data.images) ? data.images : []);
        setCreatedAt(data.createdAt ?? null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load this survey.'
        );
      } finally {
        setLoading(false);
      }
    }

    if (assessmentId) void load();
  }, [assessmentId]);

  // Frames in index order. Findings carry a sourceFrameIndex into this list, so
  // position is the contract -- a gap or a reorder would pair a finding with
  // the wrong photograph, which is worse than showing none.
  const frameUrls: string[] = [];
  for (const img of images) {
    if (typeof img.image_index === 'number') {
      frameUrls[img.image_index] = img.image_url;
    }
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-4xl mx-auto'>
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

        {!loading && !error && !assessment && (
          <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
            <p className='text-sm text-gray-700'>
              This survey has no results to show yet.
            </p>
          </div>
        )}

        {!loading && !error && assessment && (
          <>
            <BuildingAssessmentDisplay
              assessment={assessment}
              photoUrls={frameUrls.filter(Boolean)}
              frameUrls={frameUrls}
            />

            {frameUrls.filter(Boolean).length > 0 && (
              <div className='mt-8'>
                <h2 className='text-sm font-semibold text-gray-900 mb-3'>
                  Frames from this walkthrough (
                  {frameUrls.filter(Boolean).length})
                </h2>
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2'>
                  {frameUrls.map((url, index) =>
                    url ? (
                      // Signed Supabase URLs are not a configured next/image
                      // remote pattern, and they expire — optimisation would
                      // cache a dead asset.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={index}
                        src={url}
                        alt={`Walkthrough frame ${index + 1}`}
                        className='w-full aspect-square object-cover rounded-lg border border-gray-200'
                      />
                    ) : null
                  )}
                </div>
              </div>
            )}

            <div className='mt-8 pt-4 border-t border-gray-200'>
              <Link
                href={`/building-assessments/${assessmentId}/correct`}
                className='text-xs font-semibold text-gray-500 hover:text-gray-700'
              >
                Correct the AI’s detections →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
