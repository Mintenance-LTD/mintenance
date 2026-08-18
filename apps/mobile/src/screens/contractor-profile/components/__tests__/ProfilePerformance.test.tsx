/**
 * ProfilePerformance — web-parity performance panel (2026-07-31 audit P2-3).
 *
 * The behaviour worth protecting is the EMPTY STATE. Web's equivalent
 * renders raw numbers, so a contractor with no history reads as
 * "0% on-time, 0% repeat customers, 0 years" — indistinguishable from a
 * genuinely bad tradesperson, and unfair to anyone new. Mobile shows "—"
 * until there is a completed job to derive those percentages from.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ProfilePerformance } from '../ProfilePerformance';

describe('ProfilePerformance', () => {
  it('renders real figures once the contractor has completed work', () => {
    const { getByTestId } = render(
      <ProfilePerformance
        responseTime='< 2 hours'
        onTimeCompletion={92}
        repeatCustomers={40}
        yearsExperience={3}
        jobsCompleted={12}
      />
    );

    expect(getByTestId('performance-response-value').props.children).toBe(
      '< 2 hours'
    );
    expect(getByTestId('performance-ontime-value').props.children).toBe('92%');
    expect(getByTestId('performance-repeat-value').props.children).toBe('40%');
    expect(getByTestId('performance-tenure-value').props.children).toBe('3y');
  });

  it('shows "—" instead of 0% for a contractor with no completed jobs', () => {
    const { getByTestId, queryByText } = render(
      <ProfilePerformance
        responseTime={null}
        onTimeCompletion={0}
        repeatCustomers={0}
        yearsExperience={0}
        jobsCompleted={0}
      />
    );

    // The regression guard: a new contractor must NOT be labelled 0%.
    expect(getByTestId('performance-ontime-value').props.children).toBe('—');
    expect(getByTestId('performance-repeat-value').props.children).toBe('—');
    expect(getByTestId('performance-response-value').props.children).toBe('—');
    // Under a year on the platform reads "New", not "0".
    expect(getByTestId('performance-tenure-value').props.children).toBe('New');
    expect(
      queryByText(/appear once this tradesperson completes their first job/i)
    ).toBeTruthy();
  });

  it('still suppresses percentages when metrics are absent but jobs exist', () => {
    // /metrics failed (best-effort fetch) — better blank than wrong.
    const { getByTestId } = render(
      <ProfilePerformance
        responseTime={undefined}
        onTimeCompletion={undefined}
        repeatCustomers={undefined}
        yearsExperience={2}
        jobsCompleted={5}
      />
    );

    expect(getByTestId('performance-ontime-value').props.children).toBe('—');
    expect(getByTestId('performance-repeat-value').props.children).toBe('—');
    expect(getByTestId('performance-tenure-value').props.children).toBe('2y');
  });

  it('rounds fractional percentages rather than leaking decimals', () => {
    const { getByTestId } = render(
      <ProfilePerformance
        onTimeCompletion={66.6666}
        repeatCustomers={33.3333}
        yearsExperience={1}
        jobsCompleted={3}
      />
    );

    expect(getByTestId('performance-ontime-value').props.children).toBe('67%');
    expect(getByTestId('performance-repeat-value').props.children).toBe('33%');
  });

  it('does not show the footnote once there is history', () => {
    const { queryByText } = render(
      <ProfilePerformance
        onTimeCompletion={80}
        repeatCustomers={20}
        yearsExperience={1}
        jobsCompleted={4}
      />
    );

    expect(
      queryByText(/appear once this tradesperson completes their first job/i)
    ).toBeNull();
  });
});
