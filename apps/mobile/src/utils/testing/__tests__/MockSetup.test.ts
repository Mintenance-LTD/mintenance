import { setupMocks, cleanupMocks } from '../MockSetup';

describe('setupMocks', () => {
  afterEach(() => {
    cleanupMocks();
  });

  it('registers requested mocks', () => {
    setupMocks({ navigation: true, asyncStorage: true });

    expect((global as any).mockNavigation).toBeDefined();
    expect((global as any).mockAsyncStorage).toBeDefined();
  });

  it('handles empty config safely', () => {
    expect(() => setupMocks({})).not.toThrow();
  });
});
