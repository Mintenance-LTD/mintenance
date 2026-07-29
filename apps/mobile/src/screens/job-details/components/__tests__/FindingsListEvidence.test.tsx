/**
 * FindingsList — the evidence behind each finding.
 *
 * A survey asserting "mould above the kitchen cabinets" in a brand-new build is
 * not something anyone should have to take on trust. These pin what the user
 * can actually see:
 *   - when the source frame is known, that exact frame
 *   - when it is not (surveys recorded before provenance existed, whose stored
 *     evidence is empty and cannot be reconstructed), the walkthrough's frames,
 *     captioned so the uncertainty is explicit rather than implied
 *   - nothing at all for findings that report no defect
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { FindingsList } from '../SurveyorSections';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const FRAMES = [
  'https://signed/0.jpg',
  'https://signed/1.jpg',
  'https://signed/2.jpg',
];

const defect = (over: Record<string, unknown> = {}) => ({
  element: 'main_walls',
  damageType: 'damp',
  severity: 'developing',
  conditionRating: 2,
  description: 'Visible mould growth above the cabinets',
  ...over,
});

const clean = (over: Record<string, unknown> = {}) => ({
  element: 'ceilings',
  damageType: 'none',
  severity: 'early',
  conditionRating: 1,
  description: 'Ceiling appears intact with no visible cracks',
  ...over,
});

describe('FindingsList evidence', () => {
  it('shows the exact frame when provenance is recorded', () => {
    const { getByLabelText, queryByText } = render(
      <FindingsList
        findings={[
          defect({ sourceFrameIndex: 1, sourceFrameIndexes: [0, 1] }),
          clean(),
        ]}
        frameUrls={FRAMES}
      />
    );

    const img = getByLabelText('Frame the main walls finding was read from');
    expect(img.props.source).toEqual({ uri: 'https://signed/1.jpg' });
    // Knowing the frame means never showing the hedge.
    expect(queryByText(/Exact frame not recorded/)).toBeNull();
  });

  it('falls back to the walkthrough frames for a defect with no provenance', () => {
    const { getByText, getByLabelText } = render(
      <FindingsList findings={[defect(), clean()]} frameUrls={FRAMES} />
    );

    expect(
      getByText(/Exact frame not recorded · all 3 frames from this walkthrough/)
    ).toBeTruthy();
    expect(getByLabelText('Walkthrough frame 1')).toBeTruthy();
    expect(getByLabelText('Walkthrough frame 3')).toBeTruthy();
  });

  it('attaches no frames to a finding that reports no defect', () => {
    const { queryByText, queryByLabelText } = render(
      <FindingsList
        findings={[clean(), clean({ element: 'main_walls' })]}
        frameUrls={FRAMES}
      />
    );

    expect(queryByText(/Exact frame not recorded/)).toBeNull();
    expect(queryByLabelText('Walkthrough frame 1')).toBeNull();
  });

  it('treats severity as the signal when no condition rating is present', () => {
    const { getByText } = render(
      <FindingsList
        findings={[
          defect({ conditionRating: undefined, severity: 'significant' }),
          clean({ conditionRating: undefined }),
        ]}
        frameUrls={FRAMES}
      />
    );

    expect(getByText(/Exact frame not recorded/)).toBeTruthy();
  });

  it('caps the fallback strip and says so', () => {
    const many = Array.from(
      { length: 12 },
      (_, i) => `https://signed/${i}.jpg`
    );

    const { getByText, queryByLabelText } = render(
      <FindingsList findings={[defect(), clean()]} frameUrls={many} />
    );

    expect(
      getByText(
        /Exact frame not recorded · 6 of 12 frames from this walkthrough/
      )
    ).toBeTruthy();
    expect(queryByLabelText('Walkthrough frame 7')).toBeNull();
  });

  it('shows nothing when the survey has no frames at all', () => {
    const { queryByText } = render(
      <FindingsList findings={[defect(), clean()]} frameUrls={undefined} />
    );

    expect(queryByText(/Exact frame not recorded/)).toBeNull();
  });
});
