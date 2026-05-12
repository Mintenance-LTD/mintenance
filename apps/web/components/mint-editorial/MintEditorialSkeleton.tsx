'use client';

/**
 * Mint Editorial loading-skeleton primitive — canonical from
 * design-system/project/redesign-v2/states-and-edges.html lines 108-138.
 *
 * The atomic `<Bar>` is the canonical shimmering rectangle
 * (linear-gradient bg + me-skel keyframe). Variants stitch bars into
 * page-level skeletons that mirror common Mint Editorial layouts.
 *
 * The `me-skel` class + `@keyframes me-skel` live in
 * apps/web/styles/mint-editorial.css; this file just composes them
 * with the right widths/heights. `prefers-reduced-motion` users get
 * a static `var(--me-bg-2)` block via the same stylesheet.
 */

import React from 'react';

interface BarProps {
  /** Defaults to '100%'. */
  w?: string | number;
  /** Defaults to 12. */
  h?: string | number;
  /** Defaults to 6. */
  br?: string | number;
}

export function Bar({ w = '100%', h = 12, br = 6 }: BarProps) {
  return (
    <div
      className='me-skel'
      style={{
        width: typeof w === 'number' ? `${w}px` : w,
        height: typeof h === 'number' ? `${h}px` : h,
        borderRadius: typeof br === 'number' ? `${br}px` : br,
      }}
    />
  );
}

/**
 * Full page skeleton mirroring a typical Mint Editorial homeowner
 * surface: header (h1 + sub), 4-column KPI row, 5-row list card.
 * Drop in to a `<Suspense>` fallback or a `loading.tsx` body.
 */
export function MintEditorialPageSkeleton({
  kpiCount = 4,
  rowCount = 5,
}: {
  kpiCount?: number;
  rowCount?: number;
}) {
  return (
    <div style={{ padding: 28 }}>
      <Bar w='180px' h={28} />
      <div style={{ height: 8 }} />
      <Bar w='320px' h={14} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${kpiCount}, minmax(0, 1fr))`,
          gap: 14,
          margin: '20px 0 24px',
        }}
      >
        {Array.from({ length: kpiCount }).map((_, i) => (
          <div
            key={i}
            className='card card-pad'
            style={{
              minHeight: 110,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <Bar w='60%' h={11} />
            <Bar w='40%' h={26} />
            <Bar w='50%' h={11} />
          </div>
        ))}
      </div>
      <div className='card' style={{ padding: 0, overflow: 'hidden' }}>
        {Array.from({ length: rowCount }).map((_, i) => (
          <div
            key={i}
            className='row'
            style={{
              padding: 16,
              borderBottom: i < rowCount - 1 ? '1px solid var(--me-line-2)' : 0,
              gap: 14,
            }}
          >
            <Bar w={48} h={48} br={10} />
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <Bar w='40%' h={13} />
              <Bar w='65%' h={11} />
            </div>
            <Bar w={70} h={26} br={9999} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Row-only skeleton — for list pages where you want to show the
 * canonical header in the real DOM and only shimmer the list rows.
 */
export function MintEditorialListSkeleton({
  rowCount = 5,
}: {
  rowCount?: number;
}) {
  return (
    <div className='card' style={{ padding: 0, overflow: 'hidden' }}>
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          className='row'
          style={{
            padding: 16,
            borderBottom: i < rowCount - 1 ? '1px solid var(--me-line-2)' : 0,
            gap: 14,
          }}
        >
          <Bar w={48} h={48} br={10} />
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <Bar w='40%' h={13} />
            <Bar w='65%' h={11} />
          </div>
          <Bar w={70} h={26} br={9999} />
        </div>
      ))}
    </div>
  );
}

/**
 * KPI-row-only skeleton — useful inline inside an already-rendered
 * page header while just the metrics block is pending.
 */
export function MintEditorialKpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
        gap: 14,
        marginBottom: 22,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className='card card-pad'
          style={{
            minHeight: 110,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <Bar w='60%' h={11} />
          <Bar w='40%' h={26} />
          <Bar w='50%' h={11} />
        </div>
      ))}
    </div>
  );
}
