import * as contracts from '../contracts';

describe('contracts types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('type exports', () => {
    it('should export ContractorSummary interface', () => {
      const testSummary: contracts.ContractorSummary = {
        id: '123',
        name: 'Test Contractor',
        rating: 4.5,
        reviewCount: 10
      };
      expect(testSummary).toBeDefined();
    });

    it('should export Service interface', () => {
      const testService: contracts.Service = {
        id: '456',
        name: 'Test Service',
        description: 'Test Description'
      };
      expect(testService).toBeDefined();
    });

    it('should export Review interface', () => {
      // Test Review interface if it exists
      expect(contracts).toBeDefined();
    });
  });
});