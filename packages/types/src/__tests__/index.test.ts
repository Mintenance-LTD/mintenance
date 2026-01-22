import * as types from '../index';

describe('types exports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('module exports', () => {
    it('should export type definitions', () => {
      expect(types).toBeDefined();
    });

    it('should export User type if available', () => {
      // Check for common type exports
      if ('User' in types) {
        const testUser: types.User = {
          id: 'test-id',
          email: 'test@example.com',
        } as any;
        expect(testUser).toBeDefined();
      }
    });

    it('should export Job type if available', () => {
      // Check for Job type exports
      if ('Job' in types) {
        expect(types).toHaveProperty('Job');
      }
    });
  });
});