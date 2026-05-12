'use client';

/**
 * Mint Editorial dispute-flow step strip — canonical from
 * design-system/project/redesign-v2/dispute-flow.html lines 44-57.
 *
 * Renders the 4-step progress pill row at the top of every dispute
 * screen (Open dispute → Gather evidence → Mint mediates → Resolution).
 * Step indices are 0-based: 0=open, 1=evidence, 2=mediation, 3=resolved.
 */

import React from 'react';

const STEPS = [
  'Open dispute',
  'Gather evidence',
  'Mint mediates',
  'Resolution',
];

export function StepStrip({ on }: { on: 0 | 1 | 2 | 3 }) {
  return (
    <div className='step-strip'>
      {STEPS.map((label, i) => (
        <div key={i} className={'step-pill ' + (i === on ? 'on' : '')}>
          <span className='num'>{i + 1}</span> {label}
        </div>
      ))}
    </div>
  );
}
