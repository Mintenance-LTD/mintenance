'use client';

/**
 * Mint Editorial empty-state primitive — canonical from
 * design-system/project/redesign-v2/states-and-edges.html lines 66-79.
 *
 * Layout: centered column · 88×88 rounded-22 brand-soft icon tile ·
 * 22px gap · `.t-h2` title · `.t-body` sub · `.btn btn-primary` CTA ·
 * optional small ink-3 sub-text below the CTA (e.g. live "notifying
 * you" status, alternate links).
 *
 * Renders unconditionally — callers should already have gated on the
 * Mint Editorial theme. Has no theme branch of its own; if you mount
 * it outside the shell, content classes still resolve (the CSS layer
 * is scoped to `.me-root` which `HomeownerPageWrapper` provides).
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface Props {
  /** Lucide icon component (or React node) for the 88×88 glyph tile. */
  icon: LucideIcon | React.ReactNode;
  title: string;
  body: string;
  /** Primary action — either a Next route or an onClick handler. */
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Optional secondary text below the CTA (e.g. live status line). */
  sub?: React.ReactNode;
  /** Override the default `maxWidth: 360`. */
  maxWidth?: number;
  /** Override the default centered "fill-the-container" alignment. */
  align?: 'center' | 'flex-start';
}

export function MintEditorialEmptyState({
  icon,
  title,
  body,
  cta,
  sub,
  maxWidth = 360,
  align = 'center',
}: Props) {
  const IconEl =
    typeof icon === 'function'
      ? React.createElement(icon as LucideIcon, {
          size: 36,
          strokeWidth: 1.5,
        })
      : icon;

  return (
    <div
      style={{
        padding: 32,
        display: 'flex',
        justifyContent: align,
        width: '100%',
      }}
    >
      <div style={{ margin: 'auto', textAlign: 'center', maxWidth }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            background: 'var(--me-brand-soft)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 22px',
            color: 'var(--me-brand)',
          }}
        >
          {IconEl}
        </div>
        <div className='t-h2' style={{ marginBottom: 8 }}>
          {title}
        </div>
        <div className='t-body' style={{ marginBottom: 20 }}>
          {body}
        </div>
        {cta ? (
          cta.href ? (
            <Link href={cta.href} className='btn btn-primary'>
              {cta.label}
            </Link>
          ) : (
            <button
              type='button'
              className='btn btn-primary'
              onClick={cta.onClick}
            >
              {cta.label}
            </button>
          )
        ) : null}
        {sub ? (
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: 'var(--me-ink-3)',
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    </div>
  );
}
