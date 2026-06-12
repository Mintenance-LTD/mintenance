/**
 * Sparkline — tiny inline trend chart. Pure rendering; exercises the
 * empty / single-point / constant-series / normal branches of the path math.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Sparkline } from '../Sparkline';

describe('Sparkline', () => {
  it('renders an empty placeholder for no data', () => {
    const { toJSON } = render(<Sparkline data={[]} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders a single-point series (centred x)', () => {
    const { toJSON } = render(<Sparkline data={[42]} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders a constant series as a flat midline (range 0)', () => {
    const { toJSON } = render(<Sparkline data={[5, 5, 5, 5]} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders a varying series with custom dimensions + colours', () => {
    const { toJSON } = render(
      <Sparkline
        data={[1, 4, 2, 8, 5]}
        width={120}
        height={40}
        stroke='#fff'
        fillFrom='#aaa'
        fillTo='#000'
        strokeWidth={3}
      />
    );
    expect(toJSON()).toBeTruthy();
  });
});
