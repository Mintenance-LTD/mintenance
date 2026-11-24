// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

/**
 * Public contractor profile — performance signals.
 *
 * Regression: the component rendered raw numbers, so a contractor with no
 * completed jobs was shown as "0% on-time completion, 0% repeat customers,
 * 0 years experience" — indistinguishable from a genuinely bad
 * tradesperson, on the surface where homeowners pick who to hire. Verified
 * against live data at the time: every real contractor would have rendered
 * zeros. Both percentages derive from completed jobs, so with none there is
 * no basis for them.
 */
import { render, screen } from '@testing-library/react';
import { ContractorPerformanceStats } from '@/app/contractors/[id]/components/ContractorPerformanceStats';

describe('ContractorPerformanceStats', () => {
  it('renders real figures for a contractor with history', () => {
    render(
      <ContractorPerformanceStats
        responseTime='< 2 hours'
        onTimeCompletion={92}
        repeatCustomers={40}
        yearsExperience={3}
        basis={{
          onTime: { count: 11, total: 12 },
          repeat: { count: 2, total: 5 },
          responses: 12,
        }}
      />
    );

    expect(screen.getByTestId('performance-response-value')).toHaveTextContent(
      '< 2 hours'
    );
    expect(screen.getByTestId('performance-ontime-value')).toHaveTextContent(
      '92%'
    );
    expect(screen.getByTestId('performance-repeat-value')).toHaveTextContent(
      '40%'
    );
    expect(screen.getByTestId('performance-tenure-value')).toHaveTextContent(
      '3 years'
    );
    expect(
      screen.getByText('11 of 12 jobs finished by the scheduled end · All time')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/once at least three records qualify/i)
    ).toBeNull();
  });

  it('shows "—" rather than 0% for a contractor with no completed jobs', () => {
    render(
      <ContractorPerformanceStats
        responseTime=''
        onTimeCompletion={0}
        repeatCustomers={0}
        yearsExperience={0}
      />
    );

    // The defect: these must NOT read 0%.
    expect(screen.getByTestId('performance-ontime-value')).toHaveTextContent(
      '—'
    );
    expect(screen.getByTestId('performance-repeat-value')).toHaveTextContent(
      '—'
    );
    expect(screen.getByTestId('performance-response-value')).toHaveTextContent(
      '—'
    );
    expect(screen.getByTestId('performance-tenure-value')).toHaveTextContent(
      'New'
    );
    expect(
      screen.getByText(/once at least three records qualify/i)
    ).toBeInTheDocument();
  });

  it('singularises a single year of tenure', () => {
    render(
      <ContractorPerformanceStats
        responseTime='< 1 hour'
        onTimeCompletion={100}
        repeatCustomers={50}
        yearsExperience={1}
      />
    );

    expect(screen.getByTestId('performance-tenure-value')).toHaveTextContent(
      '1 year'
    );
  });

  it('rounds fractional percentages', () => {
    render(
      <ContractorPerformanceStats
        responseTime='< 3 hours'
        onTimeCompletion={66.6666}
        repeatCustomers={33.3333}
        yearsExperience={2}
        basis={{
          onTime: { count: 2, total: 3 },
          repeat: { count: 1, total: 3 },
          responses: 3,
        }}
      />
    );

    expect(screen.getByTestId('performance-ontime-value')).toHaveTextContent(
      '67%'
    );
    expect(screen.getByTestId('performance-repeat-value')).toHaveTextContent(
      '33%'
    );
  });
});
