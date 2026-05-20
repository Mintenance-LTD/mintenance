'use client';

/**
 * Left column of the unified review surface — rate + tags + comment
 * + photos placeholder. Extracted from MintEditorialJobReview to keep
 * the parent under the 500-line MDC cap.
 */

import React from 'react';
import { Star, Sparkles, Plus } from 'lucide-react';

const STAR_LABELS = ['Awful', 'Poor', 'OK', 'Great', 'Excellent'];

interface Props {
  contractorFirstName: string;
  stars: number;
  hover: number;
  setStars: (n: number) => void;
  setHover: (n: number) => void;
  tagSet: string[];
  tags: Set<string>;
  toggleTag: (t: string) => void;
  text: string;
  setText: (v: string) => void;
  charMax: number;
}

export function MintEditorialJobReviewLeft({
  contractorFirstName,
  stars,
  hover,
  setStars,
  setHover,
  tagSet,
  tags,
  toggleTag,
  text,
  setText,
  charMax,
}: Props) {
  return (
    <div className='card card-pad-lg'>
      <div style={{ marginBottom: 28 }}>
        <h2 className='t-h3' style={{ marginBottom: 4 }}>
          How did {contractorFirstName} do?
        </h2>
        <p className='t-body' style={{ marginBottom: 14 }}>
          Your rating helps the next homeowner pick the right person.
        </p>
        <div
          className='row'
          style={{ gap: 4, alignItems: 'center', flexWrap: 'wrap' }}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const on = (hover || stars) >= n;
            return (
              <button
                key={n}
                type='button'
                aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setStars(n)}
                style={{
                  width: 36,
                  height: 36,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 9,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: on ? 'var(--me-brand)' : 'var(--me-ink-3)',
                  transition: 'all .12s',
                }}
              >
                <Star
                  size={26}
                  strokeWidth={1.75}
                  fill={on ? 'currentColor' : 'none'}
                />
              </button>
            );
          })}
          <span
            style={{
              marginLeft: 14,
              fontWeight: 600,
              color: 'var(--me-ink-2)',
            }}
          >
            {stars}.0 — {STAR_LABELS[stars - 1]}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 className='t-h4' style={{ marginBottom: 10 }}>
          {stars >= 4 ? 'What stood out?' : 'What went wrong?'}
        </h3>
        <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
          {tagSet.map((t) => (
            <button
              key={t}
              type='button'
              className={'chip ' + (tags.has(t) ? 'on' : '')}
              onClick={() => toggleTag(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div
          className='row'
          style={{ alignItems: 'baseline', marginBottom: 8 }}
        >
          <h3 className='t-h4'>A few words for the next homeowner</h3>
          <span className='t-meta' style={{ marginLeft: 'auto' }}>
            {text.length}/{charMax}
          </span>
        </div>
        <textarea
          className='field'
          rows={5}
          maxLength={charMax}
          placeholder={`What was it like working with ${contractorFirstName}? Anything the next homeowner should know?`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
        <div
          style={{
            marginTop: 12,
            background:
              'linear-gradient(180deg, var(--me-brand-soft) 0%, transparent 100%)',
            border: '1px solid var(--me-brand-soft)',
            borderRadius: 14,
            padding: 16,
            display: 'flex',
            gap: 12,
            fontSize: 13,
            color: 'var(--me-ink)',
            lineHeight: 1.5,
          }}
        >
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
          <div>
            <b>Mint AI:</b> Want me to tighten this? I&apos;ll keep your voice
            but trim it to ~40 words. Polish coming soon.
          </div>
        </div>
      </div>

      <div>
        <h3 className='t-h4' style={{ marginBottom: 10 }}>
          Photos of the finished work{' '}
          <span className='t-meta' style={{ fontWeight: 400 }}>
            · optional, coming soon
          </span>
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 8,
          }}
        >
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              style={{
                height: 80,
                background:
                  'repeating-linear-gradient(135deg, transparent 0 9px, rgba(0,0,0,0.04) 9px 10px), var(--me-bg-2)',
                border: '1px solid var(--me-line)',
                borderRadius: 10,
                display: 'grid',
                placeItems: 'center',
                color: 'var(--me-ink-3)',
                fontSize: 11,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              SHOT {n}
            </div>
          ))}
          <div
            style={{
              height: 80,
              border: '1.5px dashed var(--me-line)',
              borderRadius: 10,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--me-ink-3)',
              cursor: 'not-allowed',
              opacity: 0.6,
            }}
            title='Upload coming soon'
          >
            <Plus size={20} strokeWidth={1.75} />
          </div>
        </div>
      </div>
    </div>
  );
}
