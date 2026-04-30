'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { logger } from '@mintenance/shared';

interface PropertyAssessment {
  id: string;
  domain: string | null;
  damageType: string | null;
  severity: string | null;
  confidence: number | null;
  urgency: string | null;
  validationStatus: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  thumbnailUrl: string | null;
}

interface PropertyAssessmentsProps {
  propertyId: string;
}

const URGENCY_BADGE: Record<string, string> = {
  monitor: 'bg-gray-100 text-gray-700',
  needs_attention: 'bg-amber-100 text-amber-700',
  urgent: 'bg-orange-100 text-orange-700',
  emergency: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Pending review', tone: 'text-gray-600' },
  needs_review: { label: 'Awaiting review', tone: 'text-blue-600' },
  validated: { label: 'Validated', tone: 'text-green-600' },
  completed: { label: 'Completed', tone: 'text-green-600' },
  failed: { label: 'Failed', tone: 'text-red-600' },
  ai_analysis_failed: { label: 'AI failed', tone: 'text-red-600' },
  ai_analysis_skipped_no_auth: { label: 'AI skipped', tone: 'text-amber-600' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function PropertyAssessments({
  propertyId,
}: PropertyAssessmentsProps) {
  const [assessments, setAssessments] = useState<PropertyAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/properties/${propertyId}/assessments`, {
          credentials: 'include',
        });
        if (!res.ok) {
          throw new Error(`Failed to load assessments (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) {
          setAssessments(data.assessments ?? []);
        }
      } catch (err) {
        logger.error('Property assessments fetch failed', err, {
          service: 'ui',
          propertyId,
        });
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not load assessments.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  if (loading) {
    return (
      <div className='flex items-center justify-center py-16 text-gray-500'>
        <Loader2 className='w-5 h-5 mr-2 animate-spin' />
        Loading assessments…
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-6 bg-red-50 border border-red-200 rounded-xl text-red-700'>
        <div className='flex items-center gap-2 mb-1 font-semibold'>
          <AlertTriangle className='w-4 h-4' /> Couldn&apos;t load assessments
        </div>
        <p className='text-sm'>{error}</p>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className='p-12 bg-white border border-gray-200 rounded-xl text-center'>
        <div className='mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-teal-50 mb-4'>
          <ShieldAlert className='w-6 h-6 text-teal-600' />
        </div>
        <h3 className='text-lg font-semibold text-gray-900 mb-1'>
          No assessments yet
        </h3>
        <p className='text-sm text-gray-500 mb-4 max-w-md mx-auto'>
          Capture photos or video of this property in the mobile app to start a
          building assessment. Results will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold text-gray-900'>
          Assessment History
        </h2>
        <p className='text-xs text-gray-500'>
          {assessments.length}{' '}
          {assessments.length === 1 ? 'assessment' : 'assessments'}
        </p>
      </div>

      <div className='grid gap-3'>
        {assessments.map((a) => {
          const status = a.validationStatus
            ? (STATUS_LABEL[a.validationStatus] ?? {
                label: a.validationStatus,
                tone: 'text-gray-600',
              })
            : { label: 'Unknown', tone: 'text-gray-500' };

          const urgencyClass = a.urgency
            ? (URGENCY_BADGE[a.urgency] ?? 'bg-gray-100 text-gray-700')
            : 'bg-gray-100 text-gray-700';

          return (
            <div
              key={a.id}
              className='flex flex-col sm:flex-row gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors'
            >
              <div className='relative w-full sm:w-32 h-32 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100'>
                {a.thumbnailUrl ? (
                  <Image
                    src={a.thumbnailUrl}
                    alt={`Assessment ${a.id}`}
                    fill
                    sizes='128px'
                    className='object-cover'
                  />
                ) : (
                  <div className='absolute inset-0 flex items-center justify-center text-gray-300'>
                    <ShieldAlert className='w-8 h-8' />
                  </div>
                )}
              </div>

              <div className='flex-1 min-w-0'>
                <div className='flex flex-wrap items-center gap-2 mb-2'>
                  <h3 className='text-sm font-semibold text-gray-900 capitalize'>
                    {a.damageType?.replace(/_/g, ' ') ?? 'Assessment'}
                  </h3>
                  {a.urgency && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${urgencyClass}`}
                    >
                      {a.urgency.replace(/_/g, ' ')}
                    </span>
                  )}
                  {a.severity && (
                    <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize'>
                      {a.severity}
                    </span>
                  )}
                </div>

                <div className='flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2'>
                  <span className='inline-flex items-center gap-1'>
                    <Clock className='w-3 h-3' />
                    {formatDate(a.createdAt)}
                  </span>
                  {typeof a.confidence === 'number' && a.confidence > 0 && (
                    <span className='inline-flex items-center gap-1'>
                      <CheckCircle2 className='w-3 h-3' />
                      {a.confidence}% confidence
                    </span>
                  )}
                  <span className={`font-medium ${status.tone}`}>
                    {status.label}
                  </span>
                </div>

                <Link
                  href={`/building-assessments/${a.id}/correct`}
                  className='inline-flex items-center text-xs font-semibold text-teal-700 hover:text-teal-800'
                >
                  Review or correct →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
