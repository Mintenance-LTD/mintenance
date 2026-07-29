import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import ViewAssessmentPage from '@/app/building-assessments/[id]/page';

/**
 * The read-only survey view.
 *
 * Assessment History's only link used to go to /correct, a YOLO
 * detection-annotation tool that renders bounding boxes over the frames and
 * never shows the survey — so opening your own assessment showed you the
 * photographs and none of the findings. What matters here is the opposite:
 * that the survey's actual content reaches the page.
 */

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'assessment-1' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const ASSESSMENT = {
  sceneSummary: 'Modern kitchen, recently built.',
  ricsConditionRating: 3,
  damageAssessment: {
    damageType: 'potential electrical hazard',
    severity: 'significant',
    confidence: 70,
    description: 'Exposed fitting above the units.',
    detectedItems: [],
  },
  findings: [
    {
      element: 'main_walls',
      damageType: 'damp',
      severity: 'developing',
      description: 'Discolouration above the cabinets',
      confidence: 80,
      sourceFrameIndex: 1,
      sourceFrameIndexes: [0, 1],
    },
    {
      element: 'ceilings',
      damageType: 'electrical',
      severity: 'significant',
      description: 'Exposed light fitting',
      confidence: 75,
      sourceFrameIndex: 0,
    },
  ],
  safetyHazards: { hasCriticalHazards: false, hazards: [] },
  compliance: { complianceIssues: [] },
  insuranceRisk: { riskScore: 40 },
  homeownerExplanation: {
    whatIsIt: 'A fitting is exposed.',
    whatToDo: 'Call an electrician.',
  },
  contractorAdvice: {},
  urgency: { level: 'urgent', recommendedActionTimeline: 'Within a week' },
};

function mockStatusResponse(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      id: 'assessment-1',
      status: 'pending',
      isComplete: false,
      isFailed: false,
      assessment: { damageType: 'damp', data: ASSESSMENT },
      images: [
        { image_url: 'https://signed/0.jpg', image_index: 0 },
        { image_url: 'https://signed/1.jpg', image_index: 1 },
      ],
      createdAt: '2026-07-28T21:54:12.490Z',
      ...over,
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ViewAssessmentPage', () => {
  it('renders the survey findings, not just the photographs', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockStatusResponse()) as never;

    render(<ViewAssessmentPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Discolouration above the cabinets')
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Exposed light fitting')).toBeInTheDocument();
  });

  it('shows the scene summary the correction tool never rendered', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockStatusResponse()) as never;

    render(<ViewAssessmentPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Modern kitchen, recently built/)
      ).toBeInTheDocument();
    });
  });

  it('shows each finding the frame it was read from', async () => {
    // The provenance that answers "where is it getting mould from" — a finding
    // pointing at frame 1 must show frame 1, not frame 0.
    global.fetch = vi.fn().mockResolvedValue(mockStatusResponse()) as never;

    render(<ViewAssessmentPage />);

    await waitFor(() => {
      expect(screen.getByAltText(/Frame showing main walls/)).toHaveAttribute(
        'src',
        'https://signed/1.jpg'
      );
    });
    expect(screen.getByAltText(/Frame showing ceilings/)).toHaveAttribute(
      'src',
      'https://signed/0.jpg'
    );
  });

  it('says how many frames a defect was seen in', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockStatusResponse()) as never;

    render(<ViewAssessmentPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Seen in 2 frames · showing frame 2')
      ).toBeInTheDocument();
    });
  });

  it('omits source frames on older surveys that never recorded provenance', async () => {
    // Historical rows have no sourceFrameIndex. They should look like a survey
    // without pictures, not one whose pictures failed to load.
    const legacy = {
      ...ASSESSMENT,
      findings: ASSESSMENT.findings.map(
        ({ sourceFrameIndex: _i, sourceFrameIndexes: _is, ...rest }) => rest
      ),
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'assessment-1',
        status: 'pending',
        assessment: { data: legacy },
        images: [{ image_url: 'https://signed/0.jpg', image_index: 0 }],
        createdAt: '2026-07-28T21:54:12.490Z',
      }),
    }) as never;

    render(<ViewAssessmentPage />);

    await waitFor(() => {
      expect(screen.getByText('Exposed light fitting')).toBeInTheDocument();
    });
    expect(screen.queryByAltText(/Frame showing/)).toBeNull();
  });

  it('reports a failed load instead of an empty survey', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as never;

    render(<ViewAssessmentPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load this survey/)
      ).toBeInTheDocument();
    });
  });

  it('distinguishes a missing survey from a broken one', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 404 }) as never;

    render(<ViewAssessmentPage />);

    await waitFor(() => {
      expect(screen.getByText(/could not be found/)).toBeInTheDocument();
    });
  });

  it('handles a survey that holds no result yet', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'assessment-1',
        status: 'processing',
        assessment: null,
        images: [],
      }),
    }) as never;

    render(<ViewAssessmentPage />);

    await waitFor(() => {
      expect(screen.getByText(/no results to show yet/)).toBeInTheDocument();
    });
  });

  it('still offers the correction tool as a secondary action', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockStatusResponse()) as never;

    render(<ViewAssessmentPage />);

    await waitFor(() => {
      const link = screen.getByText(/Correct the AI/);
      expect(link.closest('a')).toHaveAttribute(
        'href',
        '/building-assessments/assessment-1/correct'
      );
    });
  });
});
