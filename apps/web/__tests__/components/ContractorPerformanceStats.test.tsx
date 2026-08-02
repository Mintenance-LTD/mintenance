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
        completedJobs={12}
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
    expect(screen.queryByText(/appear once this tradesperson/i)).toBeNull();
  });

  it('shows "—" rather than 0% for a contractor with no completed jobs', () => {
    render(
      <ContractorPerformanceStats
        responseTime=''
        onTimeCompletion={0}
        repeatCustomers={0}
        yearsExperience={0}
        completedJobs={0}
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
      screen.getByText(
        /appear once this tradesperson completes their first job/i
      )
    ).toBeInTheDocument();
  });

  it('singularises a single year of tenure', () => {
    render(
      <ContractorPerformanceStats
        responseTime='< 1 hour'
        onTimeCompletion={100}
        repeatCustomers={50}
        yearsExperience={1}
        completedJobs={2}
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
        completedJobs={3}
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
