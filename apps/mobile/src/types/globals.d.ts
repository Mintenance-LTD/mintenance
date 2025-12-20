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
  var HermesInternal: any;
  var nativePerformanceNow: () => number;
  var nativeCallSyncHook: any;
}

export {};
