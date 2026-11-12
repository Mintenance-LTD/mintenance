'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertTriangle,
  Layers,
  ClipboardList,
  CalendarDays,
  Search,
  ArrowRight,
  Plus,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { logger } from '@mintenance/shared';
import { WorkspaceStat, WorkspaceBadge } from './PropertyWorkspacePrimitives';

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
  ricsConditionRating: number | null;
  needsOnsiteInspection: boolean;
}

interface PropertyAssessmentsProps {
  propertyId: string;
}

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
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('priority');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showStart, setShowStart] = useState(false);
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

  const needsReview = (a: PropertyAssessment) =>
    a.validationStatus === 'pending' || a.validationStatus === 'needs_review';
  const rank: Record<string, number> = {
    emergency: 4,
    urgent: 3,
    needs_attention: 2,
    monitor: 1,
  };
  const visible = assessments
    .filter(
      (a) =>
        (a.damageType ?? 'Assessment')
          .replace(/_/g, ' ')
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (filter === 'all' ||
          (filter === 'review' ? needsReview(a) : a.needsOnsiteInspection))
    )
    .sort((a, b) =>
      sort === 'priority'
        ? (rank[b.urgency ?? ''] ?? 0) - (rank[a.urgency ?? ''] ?? 0) ||
          (b.ricsConditionRating ?? 0) - (a.ricsConditionRating ?? 0)
        : new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime()
    );
  const selected = visible.find((a) => a.id === selectedId) ?? visible[0];
  const title = (a: PropertyAssessment) =>
    a.damageType?.replace(/_/g, ' ') ?? 'Assessment';
  const status = (a: PropertyAssessment) =>
    STATUS_LABEL[a.validationStatus ?? '']?.label ??
    a.validationStatus ??
    'Unknown';
  const severity = (a: PropertyAssessment) => (
    <WorkspaceBadge
      tone={
        a.urgency === 'emergency'
          ? 'danger'
          : ['urgent', 'needs_attention'].includes(a.urgency ?? '')
            ? 'warn'
            : 'neutral'
      }
    >
      {a.urgency?.replace(/_/g, ' ') ?? 'Not rated'}
    </WorkspaceBadge>
  );
  const condition = (a: PropertyAssessment) =>
    a.ricsConditionRating ? (
      <span title='Condition 1: routine; 2: repair needed; 3: serious or urgent'>
        <WorkspaceBadge
          tone={
            a.ricsConditionRating === 3
              ? 'danger'
              : a.ricsConditionRating === 2
                ? 'warn'
                : ''
          }
        >
          Condition {a.ricsConditionRating}
        </WorkspaceBadge>
      </span>
    ) : (
      <span className='pw-muted'>Not rated</span>
    );
  const thumbnail = (a: PropertyAssessment) => (
    <span className='pw-thumbnail'>
      {a.thumbnailUrl ? (
        <Image src={a.thumbnailUrl} alt={title(a)} fill sizes='70px' />
      ) : (
        <ShieldAlert size={26} style={{ margin: 20 }} />
      )}
    </span>
  );
  return (
    <div className='pw-stack'>
      <div className='pw-between pw-page-tools'>
        <p className='pw-muted'>Review findings and plan the next step.</p>
        <button
          className='pw-btn pw-btn-primary'
          aria-expanded={showStart}
          onClick={() => setShowStart(!showStart)}
        >
          <Plus size={18} />
          New assessment
        </button>
      </div>
      {showStart && (
        <p className='pw-notice'>
          Start a building assessment in the Mintenance mobile app: select this
          property and capture photos or video. The results will appear here for
          review.
        </p>
      )}
      <div className='pw-stats'>
        <WorkspaceStat
          icon={Layers}
          label='Total assessments'
          value={assessments.length}
        />
        <WorkspaceStat
          icon={ClipboardList}
          label='Needs review'
          value={assessments.filter(needsReview).length}
        />
        <WorkspaceStat
          icon={CalendarDays}
          label='On-site follow-up'
          value={assessments.filter((a) => a.needsOnsiteInspection).length}
        />
      </div>
      <div className='pw-split'>
        <section className='pw-card'>
          <div className='pw-toolbar'>
            <label className='pw-search'>
              <Search size={18} />
              <input
                aria-label='Search assessments'
                placeholder='Search assessments…'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              className='pw-field'
              aria-label='Assessment status'
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value='all'>Status: All</option>
              <option value='review'>Needs review</option>
              <option value='onsite'>On-site follow-up</option>
            </select>
            <select
              className='pw-field'
              aria-label='Sort assessments'
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value='priority'>Sort: Priority</option>
              <option value='newest'>Newest first</option>
            </select>
          </div>
          <div className='pw-table-wrap'>
            <table className='pw-table'>
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Date</th>
                  <th>Severity</th>
                  <th>Condition</th>
                  <th>Review status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} data-selected={a.id === selected?.id}>
                    <td>
                      <button
                        className='pw-text-button pw-row'
                        onClick={() => setSelectedId(a.id)}
                        aria-label={'Review ' + title(a)}
                      >
                        {thumbnail(a)}
                        <span
                          style={{ minWidth: 120, textTransform: 'capitalize' }}
                        >
                          {title(a)}
                        </span>
                      </button>
                    </td>
                    <td>{formatDate(a.createdAt)}</td>
                    <td>{severity(a)}</td>
                    <td>{condition(a)}</td>
                    <td>
                      <WorkspaceBadge>{status(a)}</WorkspaceBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visible.length && (
            <div className='pw-empty'>
              <ShieldAlert size={32} />
              <h3>
                {assessments.length
                  ? 'No matching assessments'
                  : 'No assessments yet'}
              </h3>
              <p>
                {assessments.length
                  ? 'Try a different search or status.'
                  : 'Capture property photos in the mobile app to start an assessment.'}
              </p>
            </div>
          )}
          <p className='pw-footer'>
            Showing {visible.length} of {assessments.length} assessments
          </p>
        </section>
        <aside className='pw-card pw-stack' aria-label='Assessment details'>
          {selected ? (
            <>
              <h2 style={{ textTransform: 'capitalize' }}>{title(selected)}</h2>
              {selected.needsOnsiteInspection && (
                <div>
                  <WorkspaceBadge tone='warn'>
                    On-site inspection needed
                  </WorkspaceBadge>
                </div>
              )}
              <div className='pw-row'>
                {thumbnail(selected)}
                <div>
                  {typeof selected.confidence === 'number' && (
                    <p>Image assessment confidence: {selected.confidence}%</p>
                  )}
                  <p
                    className='pw-muted'
                    style={{ fontSize: 14, marginTop: 6 }}
                  >
                    Image findings require professional verification.
                  </p>
                </div>
              </div>
              <dl className='pw-details'>
                <div>
                  <dt>Severity</dt>
                  <dd>{severity(selected)}</dd>
                </div>
                <div>
                  <dt>Condition</dt>
                  <dd>{condition(selected)}</dd>
                </div>
                <div>
                  <dt>Review progress</dt>
                  <dd>
                    <WorkspaceBadge>{status(selected)}</WorkspaceBadge>
                  </dd>
                </div>
              </dl>
              <h3>Next steps</h3>
              <p className='pw-muted'>
                Review the photos and findings in the full assessment, then
                arrange any follow-up work.
              </p>
              <Link
                className='pw-btn'
                href={'/building-assessments/' + selected.id}
              >
                View full assessment <ArrowRight size={17} />
              </Link>
              {selected.needsOnsiteInspection && (
                <Link
                  className='pw-btn pw-btn-primary'
                  href={'/jobs/create?property_id=' + propertyId}
                >
                  Arrange inspection <ArrowRight size={17} />
                </Link>
              )}
            </>
          ) : (
            <p className='pw-muted'>
              Select an assessment to review its findings.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
