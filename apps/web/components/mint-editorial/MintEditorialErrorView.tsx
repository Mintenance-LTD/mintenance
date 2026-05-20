'use client';

/**
 * Mint Editorial error/404 primitive — canonical from
 * design-system/project/redesign-v2/states-and-edges.html lines 141-153.
 *
 * Layout: huge `120px` Instrument-Serif brand-color code, `-0.04em`
 * tracking, line-height 1 · `.t-h2` title · `.t-body` body ·
 * two CTAs: primary action + ghost "Get help".
 *
 * Use this for both route-level error.tsx and not-found.tsx (the
 * canonical pattern doesn't distinguish — only the `code` differs).
 */

import React from 'react';
import Link from 'next/link';

interface Props {
  /** "404" / "500" / "Offline" etc. Rendered at 120px. */
  code: string;
  title: string;
  body: string;
  /** Primary action — Next route or onClick. */
  primary: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Ghost-style secondary action. Defaults to a /help link.
   *  Pass `false` to hide it. */
  secondary?:
    | {
        label: string;
        href?: string;
        onClick?: () => void;
      }
    | false;
}

export function MintEditorialErrorView({
  code,
  title,
  body,
  primary,
  secondary,
}: Props) {
  const secondaryConfig =
    secondary === false
      ? null
      : secondary || { label: 'Get help', href: '/help' };

  return (
    <div
      style={{
        padding: 40,
        display: 'flex',
        minHeight: '60vh',
        width: '100%',
      }}
    >
      <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 460 }}>
        <div
          style={{
            fontFamily: 'var(--me-font-display)',
            fontWeight: 500,
            fontSize: 120,
            color: 'var(--me-brand)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            marginBottom: 8,
          }}
        >
          {code}
        </div>
        <div className='t-h2' style={{ marginBottom: 10 }}>
          {title}
        </div>
        <div className='t-body' style={{ marginBottom: 24 }}>
          {body}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {primary.href ? (
            <Link href={primary.href} className='btn btn-primary'>
              {primary.label}
            </Link>
          ) : (
            <button
              type='button'
              className='btn btn-primary'
              onClick={primary.onClick}
            >
              {primary.label}
            </button>
          )}
          {secondaryConfig ? (
            secondaryConfig.href ? (
              <Link href={secondaryConfig.href} className='btn btn-ghost'>
                {secondaryConfig.label}
              </Link>
            ) : (
              <button
                type='button'
                className='btn btn-ghost'
                onClick={secondaryConfig.onClick}
              >
                {secondaryConfig.label}
              </button>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
