jest.mock('@mintenance/services', () => ({
  AuthService: class {
    supabase: unknown;
    environment: string | undefined;
    apiUrl: string | undefined;
    constructor(config?: { supabase?: unknown; environment?: string; apiUrl?: string }) {
      this.supabase = config?.supabase;
      this.environment = config?.environment;
      this.apiUrl = config?.apiUrl;
    }
    async logout() {}
  },
  PaymentService: class {
    constructor() {}
  },
  NotificationService: class {
    constructor() {}
  },
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: jest.fn(() => Promise.resolve()),
    })),
  },
}));

jest.mock('../../config/environment', () => ({
  config: {
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000',
  },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));
import { MobileAuthService } from '../index';

describe('MobileAuthService', () => {
  it('exports the module', () => {
    expect(MobileAuthService).toBeDefined();
  });
});
