export default {
  expo: {
    name: "Mintenance",
    slug: "mintenance",
    version: "1.1.3",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mintenance.app",
      buildNumber: "11",
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ? "./GoogleService-Info.plist" : undefined,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app needs access to location to find contractors near you.",
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: "This app needs access to camera to take photos for job postings.",
        NSPhotoLibraryUsageDescription: "This app needs access to photo library to attach images to job postings.",
        NSFaceIDUsageDescription: "This app uses Face ID for secure authentication."
      },
      associatedDomains: ["applinks:mintenance.app", "applinks:www.mintenance.app"]
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.mintenance.app",
      versionCode: 11,
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
      "sentry-expo"
    ],
    extra: {
      eas: {
        projectId: "671d1323-6979-465f-91db-e61471746ab3"
      }
    }
  }
};
