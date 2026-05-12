'use client';

/**
 * "Mint says" advice card — canonical Mint Editorial AI-tip pattern.
 *
 * Generates lightweight, deterministic suggestions from the property
 * shape + job history rather than calling out to a model. The intent
 * is *editorial advice* (the canonical mock's phrase "Mint says"), not
 * a full assessment — that lives in the Assessments tab. Real
 * personalised advice will replace the heuristic when the Mint AI
 * shadow mode flips to live.
 *
 * Phase-2 lesson learned in W1-W5: never fake data. Each tip below is
 * derived from a real field on the property/jobs payload; if nothing
 * applies we render *nothing* (the parent guards on tips.length).
 */

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { JobItem, PropertyShape } from './MintEditorialPropertyCards';

interface Tip {
  body: string;
  cta?: { href: string; label: string };
}

function deriveTips(property: PropertyShape, jobs: JobItem[]): Tip[] {
  const tips: Tip[] = [];
  const completed = jobs.filter((j) => j.status === 'completed');
  const lastCompleted = completed.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  const yearsSinceLast = lastCompleted
    ? (Date.now() - new Date(lastCompleted.date).getTime()) /
      (1000 * 60 * 60 * 24 * 365)
    : null;

  // 1. Age-based boiler/EICR nudge
  const age = property.yearBuilt
    ? new Date().getFullYear() - property.yearBuilt
    : 0;
  if (age >= 30) {
    tips.push({
      body: `This is a ${age}-year-old ${property.type.toLowerCase()} — boiler services and EICRs tend to come due more often than newer builds.`,
    });
  }

  // 2. No jobs yet → kickstart message
  if (jobs.length === 0) {
    tips.push({
      body: 'No jobs on file yet. When you post your first one I’ll start learning what this property needs and when.',
      cta: {
        href: `/jobs/create?property_id=${property.id}`,
        label: 'Post the first job',
      },
    });
  }

  // 3. Long gap since last completed job
  if (yearsSinceLast !== null && yearsSinceLast > 1) {
    const months = Math.round(yearsSinceLast * 12);
    tips.push({
      body: `Last completed job was ${months} months ago. Worth a quick check on the basics — boiler, smoke alarms, gutters.`,
    });
  }

  // 4. Lots of active jobs in flight
  const inFlight = jobs.filter((j) =>
    ['posted', 'assigned', 'in_progress'].includes(j.status)
  ).length;
  if (inFlight >= 3) {
    tips.push({
      body: `${inFlight} jobs in flight on this property — keep an eye on the dashboard so nothing gets lost between trades.`,
    });
  }

  // 5. Category memory — show what trades they’ve used most
  const categoryCounts = new Map<string, number>();
  completed.forEach((j) => {
    if (j.category && j.category !== 'General') {
      categoryCounts.set(j.category, (categoryCounts.get(j.category) ?? 0) + 1);
    }
  });
  const top = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 2) {
    tips.push({
      body: `You’ve booked ${top[1]} ${top[0].toLowerCase()} jobs here — I can match you with the same pro next time if you tell me their name.`,
    });
  }

  return tips.slice(0, 2);
}

interface Props {
  property: PropertyShape;
  jobs: JobItem[];
}

export function MintEditorialPropertyMintSays({ property, jobs }: Props) {
  const tips = deriveTips(property, jobs);
  if (tips.length === 0) return null;

  return (
    <div
      className='card card-pad'
      style={{
        background:
          'linear-gradient(180deg, var(--me-brand-soft) 0%, var(--me-surface) 60%)',
        border: '1px solid var(--me-brand-soft)',
      }}
    >
      <div className='row' style={{ gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'var(--me-brand)',
            color: 'var(--me-on-brand)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={16} strokeWidth={1.75} />
        </div>
        <div className='col' style={{ gap: 1 }}>
          <h3 className='t-h4'>Mint says</h3>
          <span className='t-meta'>
            Pattern-matched from your last {jobs.length || 'few'}{' '}
            {jobs.length === 1 ? 'job' : 'jobs'}
          </span>
        </div>
      </div>
      <div className='col' style={{ gap: 10 }}>
        {tips.map((tip, i) => (
          <p
            key={i}
            className='t-body'
            style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0 }}
          >
            {tip.body}
          </p>
        ))}
        {tips.map((tip, i) =>
          tip.cta ? (
            <Link
              key={`cta-${i}`}
              href={tip.cta.href}
              className='btn btn-primary btn-sm'
              style={{ alignSelf: 'flex-start' }}
            >
              {tip.cta.label} <ArrowRight size={12} strokeWidth={1.75} />
            </Link>
          ) : null
        )}
      </div>
    </div>
  );
}
