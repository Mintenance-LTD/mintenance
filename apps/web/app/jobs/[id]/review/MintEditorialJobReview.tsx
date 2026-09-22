'use client';

/** Approve the displayed completion and publish a review. Payment settles separately. */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';
import { MintEditorialJobReviewLeft } from './MintEditorialJobReviewLeft';
import { MintEditorialJobReviewRight } from './MintEditorialJobReviewRight';

interface ContractorShape {
  id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  rating?: number;
  total_jobs_completed?: number;
}

interface JobData {
  id: string;
  title: string;
  status: string;
  completed_at: string | null;
  // 2026-05-23: nullable for open-bidding jobs (homeowner no longer
  // sets a budget). Downstream `Number(job.budget) || 0` already
  // tolerates null; long-term the quoted-amount should source from
  // escrow_transactions.amount.
  budget: number | null;
  contractor_id: string | null;
  contractor?: ContractorShape;
  /** Set when the homeowner has already clicked Approve from the
   *  legacy HomeownerPhotoReview surface — lets us skip the
   *  confirm-completion API call. */
  completion_confirmed_by_homeowner?: boolean;
}

const TAGS_GOOD = [
  'On time',
  'Tidy',
  'Friendly',
  'Great communication',
  'Fair price',
  'Knowledgeable',
  'Went above & beyond',
];
const TAGS_BAD = ['Late', 'Messy', 'Rushed', 'Hard to reach', 'Overpriced'];
const CHAR_MAX = 600;

function contractorName(c?: ContractorShape): string {
  if (!c) return 'the contractor';
  if (c.company_name) return c.company_name;
  if (c.first_name) return `${c.first_name} ${c.last_name || ''}`.trim();
  return 'the contractor';
}
function contractorFirstName(c?: ContractorShape): string {
  if (!c) return 'them';
  if (c.first_name) return c.first_name;
  if (c.company_name) return c.company_name.split(' ')[0];
  return 'them';
}

interface Props {
  job: JobData;
}

export function MintEditorialJobReview({ job }: Props) {
  const router = useRouter();
  const [stars, setStars] = useState<number>(5);
  const [hover, setHover] = useState<number>(0);
  const [tags, setTags] = useState<Set<string>>(
    new Set(['On time', 'Tidy', 'Knowledgeable'])
  );
  const [text, setText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);

  const tagSet = stars >= 4 ? TAGS_GOOD : TAGS_BAD;
  const conName = contractorName(job.contractor);
  const conFirst = contractorFirstName(job.contractor);

  const toggleTag = (t: string) => {
    const next = new Set(tags);
    if (next.has(t)) {
      next.delete(t);
    } else {
      next.add(t);
    }
    setTags(next);
  };

  const handleSubmit = async () => {
    if (stars === 0) {
      toast.error('Pick a rating before approving work.');
      return;
    }
    if (text.trim().length < 20) {
      toast.error('Write a few words for the next homeowner (20+ chars).');
      return;
    }

    setSubmitting(true);
    try {
      // Bind approval to the completion actually displayed, even when a prior
      // response or an old page says approval was already recorded.
      if (!job.completed_at) {
        throw new Error('Reload the job to review its current completion.');
      }
      const confirmRes = await fetchWithCsrf(
        `/api/jobs/${job.id}/confirm-completion`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completedAt: job.completed_at }),
        }
      );
      const confirmation = await confirmRes.json().catch(() => null);
      if (!confirmRes.ok || confirmation?.success !== true) {
        throw new Error(
          typeof confirmation?.error === 'string'
            ? confirmation.error
            : 'Completion approval is not confirmed. Refresh and try again.'
        );
      }

      // Submit the review only after completion approval is confirmed.
      const tagList = Array.from(tags);
      const metaLines: string[] = [];
      if (tagList.length > 0) metaLines.push(`[Tags: ${tagList.join(', ')}]`);
      const body = metaLines.length
        ? `${metaLines.join('\n')}\n\n${text.trim()}`
        : text.trim();

      const reviewRes = await fetchWithCsrf(`/api/jobs/${job.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: stars,
          comment: body,
          wouldRecommend: stars >= 4,
        }),
      });
      const reviewResult = await reviewRes.json().catch(() => null);
      if (
        !reviewRes.ok ||
        reviewResult?.success !== true ||
        !reviewResult.reviewId
      ) {
        throw new Error(
          typeof reviewResult?.error === 'string'
            ? reviewResult.error
            : 'Review publication is not confirmed. Retry the same review.'
        );
      }

      setDone(true);
    } catch (err) {
      logger.error('Failed to approve work and post review', err);
      toast.error(
        err instanceof Error ? err.message : 'Something went wrong, try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          textAlign: 'center',
          padding: '80px 24px',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            margin: '0 auto 24px',
            borderRadius: 20,
            background: 'var(--me-brand)',
            color: 'var(--me-on-brand)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 16px 40px rgba(15,77,58,0.3)',
          }}
        >
          <Check size={36} strokeWidth={1.75} />
        </div>
        <h1 className='t-h1' style={{ fontSize: 48, marginBottom: 12 }}>
          Work approved and review posted.
        </h1>
        <p
          className='t-body'
          style={{
            fontSize: 16,
            maxWidth: 520,
            margin: '0 auto 32px',
            lineHeight: 1.5,
          }}
        >
          Your review is live on {conFirst}&apos;s profile. Payment release
          remains subject to the cooling-off period and final checks.
        </p>
        <div className='row' style={{ justifyContent: 'center', gap: 10 }}>
          <Link href='/dashboard' className='btn btn-primary'>
            Back to dashboard <ArrowRight size={14} strokeWidth={1.75} />
          </Link>
          <button
            type='button'
            className='btn btn-secondary'
            onClick={() => router.push(`/jobs/${job.id}`)}
          >
            View job
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div className='t-meta' style={{ marginBottom: 14 }}>
        <Link
          href='/dashboard'
          style={{ color: 'var(--me-ink-3)', textDecoration: 'none' }}
        >
          Dashboard
        </Link>{' '}
        ·{' '}
        <Link
          href={`/jobs/${job.id}`}
          style={{ color: 'var(--me-ink-3)', textDecoration: 'none' }}
        >
          {job.title}
        </Link>{' '}
        · <b style={{ color: 'var(--me-ink)' }}>Review</b>
      </div>

      {/* Hero strip */}
      <div
        style={{
          background: 'var(--me-surface)',
          border: '1px solid var(--me-line)',
          borderRadius: 22,
          padding: '32px 36px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 32,
          alignItems: 'center',
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden='true'
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(60% 80% at 90% 0%, var(--me-brand-soft), transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
              display: 'grid',
              placeItems: 'center',
              marginBottom: 16,
              boxShadow: '0 12px 28px rgba(15,77,58,0.25)',
            }}
          >
            <Check size={28} strokeWidth={2} />
          </div>
          <h1 className='t-h1' style={{ fontSize: 44, marginBottom: 10 }}>
            Job done. Now the{' '}
            <em style={{ color: 'var(--me-brand)', fontStyle: 'italic' }}>
              good bit.
            </em>
          </h1>
          <p
            className='t-body'
            style={{
              fontSize: 15,
              maxWidth: 520,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {conFirst} marked the work complete. Review the work before
            approving it and sharing your experience.
          </p>
          <div
            className='row'
            style={{
              gap: 18,
              marginTop: 18,
              fontSize: 13,
              color: 'var(--me-ink-2)',
              flexWrap: 'wrap',
            }}
          >
            <span>
              <b style={{ color: 'var(--me-ink)' }}>
                JOB-{job.id.slice(0, 6).toUpperCase()}
              </b>
              {job.completed_at
                ? ` · ${new Date(job.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                : ''}
            </span>
            <span>· {job.title}</span>
          </div>
        </div>
        <div
          style={{
            background: 'var(--me-bg-2)',
            borderRadius: 16,
            border: '1px solid var(--me-line-2)',
            height: 220,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--me-ink-3)',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
          }}
        >
          completed work · photos
        </div>
      </div>

      {/* Two-col body — extracted into sub-components */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
          gap: 22,
        }}
      >
        <MintEditorialJobReviewLeft
          contractorFirstName={conFirst}
          stars={stars}
          hover={hover}
          setStars={setStars}
          setHover={setHover}
          tagSet={tagSet}
          tags={tags}
          toggleTag={toggleTag}
          text={text}
          setText={setText}
          charMax={CHAR_MAX}
        />
        <MintEditorialJobReviewRight
          jobId={job.id}
          contractorName={conName}
          contractor={job.contractor}
          submitting={submitting}
          onSubmit={handleSubmit}
          onSaveDraft={() => router.push(`/jobs/${job.id}`)}
        />
      </div>
    </div>
  );
}
