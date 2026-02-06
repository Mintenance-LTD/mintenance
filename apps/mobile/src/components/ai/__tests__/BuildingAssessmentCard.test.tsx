import { BuildingAssessmentCard } from '../BuildingAssessmentCard';

jest.mock('../../services/UnifiedAIServiceMobile', () => ({
  __esModule: true,
  default: {
    assessBuilding: jest.fn(),
    submitCorrections: jest.fn(),
  },
}));

describe('BuildingAssessmentCard', () => {
  it('exports a component', () => {
    expect(BuildingAssessmentCard).toBeDefined();
    expect(typeof BuildingAssessmentCard).toBe('function');
  });
});
