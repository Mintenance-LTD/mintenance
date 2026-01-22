jest.mock('../../services/UnifiedAIServiceMobile', () => ({
  __esModule: true,
  default: {
    assessBuilding: jest.fn(),
    submitCorrections: jest.fn(),
  },
}));

import { BuildingAssessmentCard } from '../BuildingAssessmentCard';

describe('BuildingAssessmentCard', () => {
  it('exports a component', () => {
    expect(BuildingAssessmentCard).toBeDefined();
    expect(typeof BuildingAssessmentCard).toBe('function');
  });
});
