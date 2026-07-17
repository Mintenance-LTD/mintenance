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

const CONFIDENCE_STYLES: Record<MatchedContractor['confidenceLevel'], string> =
  {
    high: 'bg-emerald-100 text-emerald-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-neutral-100 text-neutral-600',
  };

export function RecommendedContractors({ jobId }: { jobId: string }) {
  const [matches, setMatches] = useState<MatchedContractor[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/matched-contractors`);
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
    };
  }, [jobId]);

  if (!matches || matches.length === 0) return null;

  return (
    <section
      aria-label='Recommended contractors'
      className='rounded-xl border border-neutral-200 bg-white p-6 shadow-sm'
    >
      <h2 className='text-lg font-semibold text-neutral-900'>
        Recommended contractors
      </h2>
      <p className='mt-1 text-sm text-neutral-500'>
        Ranked by skills, coverage, rating and availability. They may bid on
        your job — you always choose the winner from the bids you receive.
      </p>
      <ul className='mt-4 divide-y divide-neutral-100'>
        {matches.map((match) => {
          const name =
            match.contractor.companyName ||
            [match.contractor.firstName, match.contractor.lastName]
              .filter(Boolean)
              .join(' ') ||
            'Contractor';
          return (
            <li
              key={match.contractor.id}
              className='flex items-start justify-between gap-4 py-3'
            >
              <div className='min-w-0'>
                <p className='truncate font-medium text-neutral-900'>{name}</p>
                <p className='mt-0.5 text-sm text-neutral-500'>
                  {match.contractor.rating !== null &&
                    `★ ${match.contractor.rating.toFixed(1)} (${match.contractor.reviewCount}) · `}
                  {match.contractor.skills.slice(0, 3).join(', ')}
                </p>
                {match.reasons.length > 0 && (
                  <p className='mt-0.5 text-xs text-neutral-400'>
                    {match.reasons.slice(0, 2).join(' · ')}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${CONFIDENCE_STYLES[match.confidenceLevel]}`}
              >
                {match.matchScore}% match
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
