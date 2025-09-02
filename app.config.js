export default {
  expo: {
    name: "Mintenance",
    slug: "mintenance",
    version: "1.1.0",
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
      buildNumber: "6",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app needs access to location to find contractors near you.",
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: "This app needs access to camera to take photos for job postings.",
        NSPhotoLibraryUsageDescription: "This app needs access to photo library to attach images to job postings.",
        NSFaceIDUsageDescription: "This app uses Face ID for secure authentication."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.mintenance.app",
      versionCode: 6,
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
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
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: "34.0.0"
          },
          ios: {
            deploymentTarget: "15.1"
          }
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "671d1323-6979-465f-91db-e61471746ab3"
      }
    }
  }
};