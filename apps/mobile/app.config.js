// Simple logger for config file
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
    logger.warn('⚠️  Could not load shared environment variables:', error.message);
  }
}

// Validate required environment variables at build time
const validateEnvironment = () => {
  // Check if we're in an EAS build context
  // EAS sets EAS_BUILD=true during builds, and env vars are injected at build time
  // Also check if we're running via EAS CLI (eas build command)
  const isEASBuild = process.env.EAS_BUILD === 'true' || 
                     process.env.EAS_BUILD_PROFILE !== undefined ||
                     process.env.EAS_CLI === 'true' ||
                     (typeof process !== 'undefined' && process.argv && process.argv.some(arg => arg.includes('eas')) && process.argv.some(arg => arg.includes('build')));
  const isProductionBuild = process.env.EXPO_PUBLIC_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production';
  const isDev = process.env.NODE_ENV === 'development' || (!isProductionBuild && !isEASBuild);
  
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // During EAS builds, environment variables are injected by EAS at build time
  // Don't validate during config evaluation - EAS will handle this
  if (isEASBuild) {
    // During EAS builds, env vars are injected by the build system
    // Only warn if they're missing, but don't fail - EAS will handle validation
    if (!supabaseUrl || !supabaseKey) {
      logger.warn('⚠️  Environment variables not yet available during EAS config evaluation.');
      logger.warn('📋 They will be injected by EAS at build time from eas.json env section or EAS secrets.');
    }
    return; // Don't validate during EAS build config evaluation
  }

  // Only throw errors during local production builds (not EAS builds)
  if (isProductionBuild && !isEASBuild && (!supabaseUrl || !supabaseKey)) {
    const missing = [];
    if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

    logger.error('❌ Missing required environment variables:', missing.join(', '));
    logger.error('📋 Set these variables before building for production:');
    logger.error('   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    logger.error('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here');

    throw new Error(`Production build requires Supabase credentials: ${missing.join(', ')}`);
  } else if (isDev && (!supabaseUrl || !supabaseKey)) {
    // In development, warn if missing but allow to continue
    const missing = [];
    if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

    logger.warn('⚠️  Missing Supabase environment variables:', missing.join(', '));
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
  if (process.env.EAS_BUILD_PROFILE || process.argv.some(arg => arg.includes('eas'))) {
    logger.warn('⚠️  Validation warning (non-fatal):', error.message);
  } else {
    throw error;
  }
}

export default {
  expo: {
    name: "Mintenance",
    slug: "mintenance",
    version: "1.2.4",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0EA5E9"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mintenance.app",
      buildNumber: "16",
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ? "./GoogleService-Info.plist" : undefined,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app needs location access to find nearby contractors and show job locations.",
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: "This app needs camera access to take photos of jobs and upload project images.",
        NSPhotoLibraryUsageDescription: "This app needs photo library access to select images for job posts and project galleries.",
        NSFaceIDUsageDescription: "This app uses Face ID for secure authentication."
      },
      associatedDomains: ["applinks:mintenance.app", "applinks:www.mintenance.app"]
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0EA5E9"
      },
      config: { 
        googleMaps: { 
          apiKey: process.env.GOOGLE_MAPS_API_KEY 
        } 
      },
      package: "com.mintenance.app",
      versionCode: 16,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ? "./google-services.json" : undefined,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "mintenance.app"
            },
            {
              scheme: "https", 
              host: "www.mintenance.app"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ],
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    scheme: "mintenance",
    updates: {
      url: "https://u.expo.dev/671d1323-6979-465f-91db-e61471746ab3"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    plugins: [
      "expo-dev-client",
      ["expo-build-properties", {
        android: {
          enableProguardInReleaseBuilds: true,
          enableSeparateBuildPerCPUArchitecture: true,
          universalApk: false,
          enableHermes: true,
          minSdkVersion: 24,
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          buildToolsVersion: "36.0.0",
          packagingOptions: {
            pickFirst: ["**/libc++_shared.so", "**/libjsc.so"]
          },
          proguardFiles: ["proguard-android-optimize.txt"]
        },
        ios: {
          deploymentTarget: "15.1",
          useFrameworks: "static"
        }
      }],
      ["expo-location", {
        locationAlwaysAndWhenInUsePermission: "This app needs location access to find nearby contractors and show job locations.",
        locationAlwaysPermission: "This app needs location access to find nearby contractors and show job locations.",
        locationWhenInUsePermission: "This app needs location access to find nearby contractors and show job locations."
      }],
      ["expo-image-picker", {
        photosPermission: "This app needs photo library access to select images for job posts and project galleries.",
        cameraPermission: "This app needs camera access to take photos of jobs and upload project images."
      }],
      ["expo-notifications", {
        icon: "./assets/notification-icon.png",
        color: "#0EA5E9",
        defaultChannel: "default"
      }],
      ["expo-local-authentication", {
        faceIDPermission: "This app uses Face ID for secure authentication and faster login."
      }],
      "expo-web-browser",
      "sentry-expo"
    ],
    extra: {
      eas: {
        projectId: "671d1323-6979-465f-91db-e61471746ab3"
      },
      // Supabase runtime config (read by src/config/supabase.ts)
      // Both URL and key MUST be provided via environment variables. No defaults to avoid leaks.
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    }
  }
};









