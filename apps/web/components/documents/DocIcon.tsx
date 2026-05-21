'use client';

/**
 * DocIcon — 54×68 file-shape tile used on every document card across
 * /documents and /contractor/documents. Matches the spec from
 * redesign-v2/documents-web.html: soft tinted background, the
 * type's icon centred, and a small white extension chip in the
 * bottom-right corner ("PDF" / "JPG" / "BID" / "DOC").
 *
 * Pure presentational — colour pair + icon come from the parent.
 */

import React from 'react';

interface DocIconProps {
  /** Foreground colour (paper-shape fill / icon stroke). */
  color: string;
  /** Soft background tint. */
  bg: string;
  /** Top-right corner chip — "PDF", "JPG", "BID", "DOC", "PNG". */
  ext: string;
  /** Centre icon. Must render at currentColor stroke. */
  children: React.ReactNode;
}

export function DocIcon({ color, bg, ext, children }: DocIconProps) {
  return (
    <div
      style={{
        width: 54,
        height: 68,
        borderRadius: 8,
        background: bg,
        color,
        // A 30%-opacity border on the type colour matches the spec
        // (`border: "1px solid " + ts.color + "30"`). Encoded via the
        // CSS `color-mix` trick so we don't hard-code a hex literal.
        border: `1px solid ${color}33`,
        display: 'grid',
        placeItems: 'center',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {children}
      <span
        style={{
          position: 'absolute',
          bottom: 4,
          right: 4,
          fontSize: 9,
          fontWeight: 700,
          padding: '1px 5px',
          borderRadius: 3,
          background: 'var(--me-surface)',
          color,
          letterSpacing: 0.4,
        }}
      >
        {ext}
      </span>
    </div>
  );
}
