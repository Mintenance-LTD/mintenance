'use client';

/**
 * Recommended contractors — additive homeowner-side surface for the
 * AIMatchingService ranking (Phase 3, 2026-07-17). First UI consumer of
 * GET /api/jobs/[id]/matched-contractors (previously a dead endpoint).
 *
 * Informational only: the bid marketplace is unchanged — homeowners
 * still pick a winner from real bids. No auto-assign, no invite side
 * effects. Renders nothing while the job is past `posted`, on error, or
 * when there are no matches, so it can never break the page around it.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface MatchedContractor {
  contractor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    profileImageUrl: string | null;
    skills: string[];
    rating: number | null;
    reviewCount: number;
    yearsExperience: number | null;
  };
  matchScore: number;
  distance: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  reasons: string[];
}

interface MatchedContractorsResponse {
  matches: MatchedContractor[];
}

export function RecommendedContractors({ jobId }: { jobId: string }) {
  const [matches, setMatches] = useState<MatchedContractor[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setMatches(null);
    const load = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/matched-contractors`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as MatchedContractorsResponse;
        if (!cancelled && Array.isArray(data.matches)) {
          setMatches(data.matches.slice(0, 5));
        }
      } catch {
        // Additive surface — swallow and render nothing.
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [jobId]);

  if (!matches || matches.length === 0) return null;

  return (
    <section
      aria-label='Recommended contractors'
      className='card card-pad rounded-xl border border-neutral-200 bg-white p-5'
    >
      <h2 className='t-h4'>Contractors to consider</h2>
      <p className='t-meta' style={{ marginTop: 6, maxWidth: 560 }}>
        Suggested for this job using skills, service area, ratings and
        availability. These are suggestions, not bids. Review their profiles and
        choose from the quotes you receive.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0' }}>
        {matches.map((match) => {
          const contractor = match.contractor;
          const name =
            contractor.companyName ||
            [contractor.firstName, contractor.lastName]
              .filter(Boolean)
              .join(' ') ||
            'Contractor';
          return (
            <li
              key={contractor.id}
              style={{
                padding: '14px 0',
                borderTop: '1px solid var(--me-line-2)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  aria-hidden='true'
                  className='avatar avatar-md'
                  style={{
                    background: 'var(--me-brand-soft)',
                    color: 'var(--me-brand)',
                    flexShrink: 0,
                  }}
                >
                  {name.slice(0, 1).toUpperCase()}
                </span>
                <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                  <h3 className='t-h4' style={{ overflowWrap: 'anywhere' }}>
                    {name}
                  </h3>
                  <p className='t-meta' style={{ marginTop: 3 }}>
                    {contractor.skills.slice(0, 3).join(' · ')}
                  </p>
                  {contractor.rating !== null && contractor.reviewCount > 0 && (
                    <p className='t-meta' style={{ marginTop: 3 }}>
                      {contractor.rating.toFixed(1)} / 5 ·{' '}
                      {contractor.reviewCount} reviews
                    </p>
                  )}
                </div>
                <Link
                  href={`/contractors/${contractor.id}`}
                  className='btn btn-secondary btn-sm'
                  aria-label={`View ${name}'s profile`}
                >
                  View profile
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
