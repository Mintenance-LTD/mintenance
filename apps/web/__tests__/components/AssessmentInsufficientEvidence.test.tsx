import React from 'react';
import { render, screen } from '@testing-library/react';
import { BuildingAssessmentDisplay } from '@/components/building-surveyor/BuildingAssessmentDisplay';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import { BuildingAssessmentsCard } from '@/app/admin/building-assessments/components/BuildingAssessmentsCard';
import type { Assessment } from '@/app/admin/building-assessments/components/BuildingAssessmentsTypes';

describe('unassessable survey display', () => {
  it('does not show legacy scores or validation controls on the admin list', () => {
    render(
      <BuildingAssessmentsCard
        assessment={
          {
            confidence: 0,
            safety_score: 100,
            assessment_data: {},
            validation_status: 'pending',
          } as Assessment
        }
        loading={false}
        onReview={vi.fn()}
        onValidate={vi.fn()}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('not been assessed');
    expect(screen.queryByText(/100/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /validate|approve/i })
    ).not.toBeInTheDocument();
  });
  it('withholds legacy reassuring ratings and the use-assessment action', () => {
    const assessment = {
      damageAssessment: { confidence: 0, damageType: 'no_defect' },
      safetyHazards: { overallSafetyScore: 100 },
      compliance: { complianceScore: 100 },
      ricsConditionRating: 1,
      homeownerExplanation: { whatToDo: 'No action needed' },
    } as unknown as Phase1BuildingAssessment;
    render(
      <BuildingAssessmentDisplay
        assessment={assessment}
        onUseAssessment={vi.fn()}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Safety and condition have not been assessed'
    );
    expect(screen.queryByText(/No action needed/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/100/)).not.toBeInTheDocument();
  });
});
