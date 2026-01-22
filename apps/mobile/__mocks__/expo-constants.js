module.exports = {
  AppOwnership: {
    Expo: 'expo',
    Standalone: 'standalone',
  },
  ExecutionEnvironment: {
    Bare: 'bare',
    Standalone: 'standalone',
    StoreClient: 'storeClient',
  },
  default: {
    appOwnership: 'expo',
    executionEnvironment: 'standalone',
    expoVersion: '49.0.0',
    manifest: {
      name: 'mintenance',
      slug: 'mintenance',
      version: '1.0.0',
      sdkVersion: '49.0.0',
    },
    platform: {
      ios: {
        model: 'iPhone 13',
        systemVersion: '15.0',
      },
      android: {
        versionCode: 1,
      },
    },
  },
};