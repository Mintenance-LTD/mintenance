const path = require('path');
const fs = require('fs');

// Simple console logger for config file
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
};

// Load shared environment variables from web app or root .env files
// This allows sharing Supabase credentials between web and mobile apps
// Use dynamic import to avoid issues during config evaluation
let envLoaded = false;
try {
  // Only load if not already loaded (prevents double-loading during config eval)
  if (!envLoaded && typeof require !== 'undefined') {
    require('./load-env.js');
    envLoaded = true;
  }
} catch (error) {
  // Silently fail if load-env.js doesn't exist or has errors
  // This allows the app to work with mobile-specific .env files
  // Only log in development to avoid noise in builds
  if (process.env.NODE_ENV === 'development') {
    logger.warn(
      '⚠️  Could not load shared environment variables:',
      error.message
    );
  }
}

// Validate required environment variables at build time
const validateEnvironment = () => {
  // Check if we're in an EAS build context
  // EAS sets EAS_BUILD=true during builds, and env vars are injected at build time
  // Also check if we're running via EAS CLI (eas build command)
  const isEASBuild =
    process.env.EAS_BUILD === 'true' ||
    process.env.EAS_BUILD_PROFILE !== undefined ||
    process.env.EAS_CLI === 'true' ||
    (typeof process !== 'undefined' &&
      process.argv &&
      process.argv.some((arg) => arg.includes('eas')) &&
      process.argv.some((arg) => arg.includes('build')));
  const isProductionBuild =
    process.env.EXPO_PUBLIC_ENVIRONMENT === 'production' ||
    process.env.NODE_ENV === 'production';
  const isDev =
    process.env.NODE_ENV === 'development' ||
    (!isProductionBuild && !isEASBuild);

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // During EAS builds, environment variables are injected by EAS at build time
  // Don't validate during config evaluation - EAS will handle this
  if (isEASBuild) {
    // During EAS builds, env vars are injected by the build system
    // Only warn if they're missing, but don't fail - EAS will handle validation
    if (!supabaseUrl || !supabaseKey) {
      logger.warn(
        '⚠️  Environment variables not yet available during EAS config evaluation.'
      );
      logger.warn(
        '📋 They will be injected by EAS at build time from eas.json env section or EAS secrets.'
      );
    }
    return; // Don't validate during EAS build config evaluation
  }

  // Only throw errors during local production builds (not EAS builds)
  if (isProductionBuild && !isEASBuild && (!supabaseUrl || !supabaseKey)) {
    const missing = [];
    if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

    logger.error(
      '❌ Missing required environment variables:',
      missing.join(', ')
    );
    logger.error('📋 Set these variables before building for production:');
    logger.error(
      '   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co'
    );
    logger.error('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here');

    throw new Error(
      `Production build requires Supabase credentials: ${missing.join(', ')}`
    );
  } else if (isDev && (!supabaseUrl || !supabaseKey)) {
    // In development, warn if missing but allow to continue
    const missing = [];
    if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

    logger.warn(
      '⚠️  Missing Supabase environment variables:',
      missing.join(', ')
    );
    logger.warn('📋 App will use mock client. Set these for real data:');
    logger.warn('   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    logger.warn('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here');
  }
};

// Run validation (suppress errors during EAS CLI execution)
try {
  validateEnvironment();
} catch (error) {
  // During EAS builds, don't fail on validation - EAS will handle env vars
  if (
    process.env.EAS_BUILD_PROFILE ||
    process.argv.some((arg) => arg.includes('eas'))
  ) {
    logger.warn('⚠️  Validation warning (non-fatal):', error.message);
  } else {
    throw error;
  }
}

// Resolve a Firebase config file for googleServicesFile.
// EAS file-type env vars contain the absolute path of the file on the build
// VM (the file itself is NOT in the project upload — it is gitignored and
// .easignore'd). Locally, the env var is unset and the repo-root copy is used.
const resolveGoogleServicesFile = (envVar, localPath) => {
  const fromEnv = process.env[envVar];
  if (fromEnv && fs.existsSync(fromEnv)) {
    return fromEnv;
  }
  if (fs.existsSync(path.join(__dirname, localPath))) {
    return localPath;
  }
  logger.warn(
    `⚠️  ${envVar} not set and ${localPath} not found — build will have no ` +
      'Firebase config; push notifications will NOT work in this binary.'
  );
  return undefined;
};

module.exports = {
  expo: {
    name: 'Mintenance',
    slug: 'mintenance',
    owner: 'mintenance-ltd',
    version: '1.2.4',
    description:
      'Property maintenance made simple. Connect homeowners with trusted local contractors for repairs, renovations, and maintenance jobs. Get bids, manage projects, and pay securely.',
    // Align with src/theme/index.ts primary (#0D9488 teal-600) so the
    // splash -> first-paint transition is seamless. Previously #10B981
    // caused a visible color jump.
    primaryColor: '#0D9488',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0D9488',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.mintenance.app',
      buildNumber: '16',
      // EAS file env vars resolve to a PATH on the build VM — use that value
      // directly. Fall back to the local file for non-EAS builds. The repo
      // copy is gitignored AND .easignore'd, so the literal './…' path never
      // exists on the EAS builder; pointing at it shipped builds with no
      // Firebase config (push tokens could never be issued).
      googleServicesFile: resolveGoogleServicesFile(
        'GOOGLE_SERVICES_PLIST',
        './GoogleService-Info.plist'
      ),
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'This app needs location access to find nearby contractors and show job locations.',
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription:
          'This app needs camera access to take photos of jobs and upload project images.',
        NSPhotoLibraryUsageDescription:
          'This app needs photo library access to select images for job posts and project galleries.',
        NSFaceIDUsageDescription:
          'This app uses Face ID for secure authentication.',
        NSMicrophoneUsageDescription:
          'This app needs microphone access to record voice notes on job updates and for video calls with contractors.',
        UIBackgroundModes: ['remote-notification'],
      },
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType:
              'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
        ],
      },
      appStoreUrl: 'https://apps.apple.com/app/mintenance/id0000000000',
      // 2026-06-08: universal-link host migrated to the canonical UK domain
      // mintenance.co.uk. Must match the JS prefixes in
      // src/navigation/deepLinking.ts AND the server-hosted
      // /.well-known/apple-app-site-association on mintenance.co.uk (whose
      // appID is <TeamID>.com.mintenance.app). Changing this requires an
      // EAS/native rebuild — JS-only OTA updates do not re-write entitlements.
      associatedDomains: [
        'applinks:mintenance.co.uk',
        'applinks:www.mintenance.co.uk',
      ],
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0D9488',
      },
      config: {
        googleMaps: {
          apiKey:
            process.env.GOOGLE_MAPS_API_KEY ||
            process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
      package: 'com.mintenance.app',
      versionCode: 16,
      // See iOS googleServicesFile note: env var IS the file path on EAS.
      googleServicesFile: resolveGoogleServicesFile(
        'GOOGLE_SERVICES_JSON',
        './google-services.json'
      ),
      playStoreUrl:
        'https://play.google.com/store/apps/details?id=com.mintenance.app',
      // 2026-06-08: App Links host migrated to mintenance.co.uk. autoVerify
      // requires /.well-known/assetlinks.json on mintenance.co.uk to list this
      // package (com.mintenance.app) + the release signing-cert SHA-256.
      // Requires an EAS/native rebuild to re-generate AndroidManifest.
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'mintenance.co.uk',
            },
            {
              scheme: 'https',
              host: 'www.mintenance.co.uk',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      permissions: [
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'CAMERA',
        'RECORD_AUDIO',
        'USE_BIOMETRIC',
        'USE_FINGERPRINT',
        'VIBRATE',
        'RECEIVE_BOOT_COMPLETED',
        'WAKE_LOCK',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    scheme: 'mintenance',
    updates: {
      url: 'https://u.expo.dev/1ee95edc-0cc1-4775-b52e-4af46f9e51d0',
    },
    runtimeVersion: '1.2.4',
    plugins: [
      // Android security hardening: allowBackup=false, usesCleartextTraffic=false,
      // NSC (reject user CAs), backup/data-extraction exclusions for session
      // storage / SQLite / AsyncStorage, and SYSTEM_ALERT_WINDOW stripping.
      // Applied on every `expo prebuild`. See apps/mobile/plugins/android-security/.
      './plugins/android-security',
      [
        'expo-build-properties',
        {
          android: {
            newArchEnabled: true,
            enableProguardInReleaseBuilds: true,
            enableSeparateBuildPerCPUArchitecture: true,
            universalApk: false,
            enableHermes: true,
            minSdkVersion: 24,
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: '35.0.0',
            packagingOptions: {
              pickFirst: ['**/libc++_shared.so', '**/libjsc.so'],
            },
            proguardFiles: ['proguard-android-optimize.txt'],
            // Ported from the (no longer uploaded) android/app/proguard-rules.pro.
            // Without the Stripe rules, :app:minifyReleaseWithR8 fails on
            // missing com.stripe.android.pushProvisioning.* classes referenced
            // by @stripe/stripe-react-native (build 4a20efcb).
            extraProguardRules: [
              '# react-native-reanimated',
              '-keep class com.swmansion.reanimated.** { *; }',
              '-keep class com.facebook.react.turbomodule.** { *; }',
              '# Stripe push provisioning (proprietary library not bundled in build)',
              '-dontwarn com.stripe.android.pushProvisioning.**',
              '-keep class com.stripe.android.pushProvisioning.** { *; }',
            ].join('\n'),
          },
          ios: {
            newArchEnabled: true,
            deploymentTarget: '15.1',
            useFrameworks: 'static',
          },
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'This app needs location access to find nearby contractors and show job locations.',
          locationAlwaysPermission:
            'This app needs location access to find nearby contractors and show job locations.',
          locationWhenInUsePermission:
            'This app needs location access to find nearby contractors and show job locations.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'This app needs photo library access to select images for job posts and project galleries.',
          cameraPermission:
            'This app needs camera access to take photos of jobs and upload project images.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#0D9488',
          defaultChannel: 'default',
          // FCM v1 is used automatically when google-services.json is present
          // For Android: requires google-services.json provided via EAS Secrets
          // For iOS: requires GoogleService-Info.plist + APNs key provided via EAS Secrets
          enableBackgroundRemoteNotifications: true,
        },
      ],
      [
        'expo-local-authentication',
        {
          faceIDPermission:
            'This app uses Face ID for secure authentication and faster login.',
        },
      ],
      [
        '@sentry/react-native/expo',
        {
          organization: process.env.SENTRY_ORG || 'mintenance',
          project: process.env.SENTRY_PROJECT || 'mintenance-mobile',
        },
      ],
      [
        '@stripe/stripe-react-native',
        {
          merchantIdentifier: 'merchant.com.mintenance.app',
          enableGooglePay: true,
        },
      ],
      'expo-font',
      'expo-web-browser',
      '@react-native-community/datetimepicker',
    ],
    extra: {
      eas: {
        projectId: '1ee95edc-0cc1-4775-b52e-4af46f9e51d0',
        owner: 'mintenance-ltd',
      },
      // Supabase runtime config (read by src/config/supabase.ts)
      // Both URL and key MUST be provided via environment variables. No defaults to avoid leaks.
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      // App metadata — used at runtime and by store submission tooling.
      // 2026-06-08: migrated off legacy mintenance.app to the canonical UK
      // domain, matching config/legal.ts (TERMS_URL/PRIVACY_URL) and the
      // universal-link host above.
      privacyPolicyUrl: 'https://mintenance.co.uk/privacy',
      termsOfServiceUrl: 'https://mintenance.co.uk/terms',
      supportUrl: 'https://mintenance.co.uk/support',
      marketingUrl: 'https://mintenance.co.uk',
      // 2026-05-27 audit-79 P2: the Android native config above accepts
      // either GOOGLE_MAPS_API_KEY (non-public, EAS secret) or
      // EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (baked into JS bundle). The
      // JS runtime guards in ExploreMapScreen / JobLocationMap can only
      // see EXPO_PUBLIC_*, so an EAS build configured only with the
      // non-public secret correctly stamped the manifest but the
      // runtime fell back to "Map unavailable". Surface a build-time
      // boolean via `extra` so the runtime can match what the native
      // build actually has. Read at runtime via
      // expo-constants -> Constants.expoConfig?.extra?.androidGoogleMapsConfigured.
      androidGoogleMapsConfigured: Boolean(
        process.env.GOOGLE_MAPS_API_KEY ||
        process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      ),
    },
  },
};
