'use client';

/**
 * BeforeAfterSlider — draggable overlay comparison of a before/after image pair.
 *
 * Web port of the mobile component at
 * apps/mobile/src/components/BeforeAfterSlider.tsx used in
 * HomeownerPhotoReviewScreen. Surfaces the same UX on the homeowner web
 * approval flow so both platforms show side-by-side work evidence.
 *
 * Pure CSS + pointer events — no heavy dep. Works with mouse, touch, and
 * keyboard (ArrowLeft/Right to adjust the divider).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  height?: number;
  /**
   * Label text shown in the corner badges. Defaults to BEFORE / AFTER.
   */
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  height = 320,
  beforeLabel = 'BEFORE',
  afterLabel = 'AFTER',
}: BeforeAfterSliderProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(50); // percent
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(
      0,
      Math.min(100, ((clientX - rect.left) / rect.width) * 100)
    );
    setPosition(pct);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  // Keyboard accessibility — slider role.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      setPosition((p) => Math.max(0, p - 2));
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      setPosition((p) => Math.min(100, p + 2));
      e.preventDefault();
    }
  };

  useEffect(() => {
    // Defensive: cancel drag if pointer leaves window.
    const end = () => {
      draggingRef.current = false;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role='slider'
      tabIndex={0}
      aria-label='Before/after photo comparison'
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      style={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden',
        borderRadius: 12,
        backgroundColor: '#000',
        userSelect: 'none',
        touchAction: 'none',
        cursor: 'ew-resize',
      }}
    >
      {/* AFTER image: full width base layer */}
      <img
        src={afterUrl}
        alt='After'
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
        }}
      />

      {/* BEFORE image: clipped to slider position */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: `${position}%`,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <img
          src={beforeUrl}
          alt='Before'
          draggable={false}
          style={{
            width: `${(100 / Math.max(position, 0.001)) * 100}%`,
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'left center',
          }}
        />
      </div>

      {/* Divider + handle */}
      <div
        aria-hidden='true'
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${position}%`,
          width: 2,
          backgroundColor: '#FFFFFF',
          transform: 'translateX(-50%)',
          boxShadow: '0 0 8px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1F2937',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ‹›
        </div>
      </div>

      {/* Corner labels */}
      <span
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: '4px 10px',
          borderRadius: 8,
          backgroundColor: 'rgba(0,0,0,0.65)',
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          pointerEvents: 'none',
        }}
      >
        {beforeLabel}
      </span>
      <span
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          padding: '4px 10px',
          borderRadius: 8,
          backgroundColor: 'rgba(0,0,0,0.65)',
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          pointerEvents: 'none',
        }}
      >
        {afterLabel}
      </span>
    </div>
  );
}

export default BeforeAfterSlider;
