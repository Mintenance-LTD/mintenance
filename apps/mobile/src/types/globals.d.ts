// Global type declarations for React Native and Expo
declare var __DEV__: boolean;

// Extend global object for React Native specific properties
declare global {
  var __DEV__: boolean;

  namespace NodeJS {
    interface Global {
      __DEV__: boolean;
    }
  }

  interface Window {
    __DEV__?: boolean;
  }

  // React Native globals
  var HermesInternal: {
    enablePromise?: boolean;
    hasES6Symbol?: boolean;
    [key: string]: unknown;
  };
  var nativePerformanceNow: () => number;
  var nativeCallSyncHook: ((...args: unknown[]) => unknown) | undefined;

  // Payment test globals (used in test setup)
  var __PAYMENT_TEST_CONSTANTS__: {
    TEST_AMOUNTS: {
      SMALL: number;
      MEDIUM: number;
      LARGE: number;
      EXCEEDS_LIMIT: number;
    };
    TEST_CARDS: {
      VALID: string;
      DECLINED: string;
      INSUFFICIENT_FUNDS: string;
      THREE_D_SECURE: string;
    };
    TEST_USERS: {
      HOMEOWNER: { id: string; email: string; role: string };
      CONTRACTOR: { id: string; email: string; role: string };
    };
  };

  var __PAYMENT_PERFORMANCE__: {
    startTime: number;
    markStart: (label: string) => void;
    markEnd: (label: string) => void;
    getDuration: (label: string) => number;
    [key: string]: number | ((label: string) => void) | ((label: string) => number);
  };

  var __PAYMENT_SECURITY_TEST__: boolean;

  var __PAYMENT_TEST_UTILS__: {
    waitForPaymentProcessing: (timeout?: number) => Promise<void>;
    generateTestPaymentData: (overrides?: Record<string, unknown>) => Record<string, unknown>;
    validatePaymentResponse: (response: unknown) => void;
  };
}

export {};
