// Load shared environment variables from web app or root .env files
// This allows sharing Supabase credentials between web and mobile apps
try {
  require('./load-env.js');
} catch (error) {
  // Silently fail if load-env.js doesn't exist or has errors
  // This allows the app to work with mobile-specific .env files
}

// Validate required environment variables at build time
const validateEnvironment = () => {
  // Check if we're in a production build context (EAS build, not dev server)
  const isProductionBuild = process.env.EAS_BUILD === 'true' || process.env.EXPO_PUBLIC_ENVIRONMENT === 'production';
  const isDev = process.env.NODE_ENV === 'development' || !isProductionBuild;
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Only throw errors during actual production builds, not during dev server startup
  if (isProductionBuild && (!supabaseUrl || !supabaseKey)) {
    const missing = [];
    if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('📋 Set these variables before building for production:');
    console.error('   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    console.error('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here');

    throw new Error(`Production build requires Supabase credentials: ${missing.join(', ')}`);
  } else if (isDev && (!supabaseUrl || !supabaseKey)) {
    // In development, warn if missing but allow to continue
    const missing = [];
    if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

    console.warn('⚠️  Missing Supabase environment variables:', missing.join(', '));
    console.warn('📋 App will use mock client. Set these for real data:');
    console.warn('   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    console.warn('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here');
  }
};

// Run validation
validateEnvironment();

export default {
  expo: {
    name: "Mintenance",
    slug: "mintenance",
    version: "1.2.3",
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
      buildNumber: "15",
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
      versionCode: 15,
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









