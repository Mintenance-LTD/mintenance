/**
 * Expo config plugin: Android security hardening.
 *
 * Rebuilds from app.config.js on every `expo prebuild`, so the four
 * changes below survive native folder regeneration:
 *
 *   1. <application android:allowBackup="false">
 *      Prevents ADB backup from exfiltrating session tokens, the
 *      offline SQLite, and the React Query persisted cache. A payment
 *      app on Android should never allow Auto Backup unless the
 *      sensitive paths are explicitly excluded (they weren't).
 *
 *   2. <application android:usesCleartextTraffic="false">
 *      Explicitly denies http:// traffic. Android 9+ defaults to this
 *      but we set it explicitly for Play-review scrutiny and to make
 *      the intent obvious to reviewers.
 *
 *   3. <application android:networkSecurityConfig="@xml/network_security_config">
 *      Rejects user-installed CAs (airport/cafe captive portal proxies,
 *      corporate MITM boxes) — pairs with the future cert-pinning
 *      work. Drops cleartextTrafficPermitted across the board.
 *
 *   4. <application android:dataExtractionRules="@xml/data_extraction_rules">
 *            + android:fullBackupContent="@xml/backup_rules">
 *      Defense-in-depth even when allowBackup is false: if a future
 *      edit toggles it back on, these exclude RKStorage (AsyncStorage),
 *      mintenance_local.db (offline store), and secure_store.xml
 *      (expo-secure-store fallback) from every backup/transfer path.
 *
 *   5. Removes android.permission.SYSTEM_ALERT_WINDOW if a transitive
 *      Expo plugin tries to inject it. A maintenance-jobs app has no
 *      legitimate need for overlay permission — it's a permission
 *      Play Protect scrutinizes heavily and users distrust.
 *
 * Referenced from app.config.js as:
 *   plugins: [
 *     ['./plugins/android-security', {}],
 *     ...
 *   ]
 */

const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const XML_SOURCE_DIR = path.join(__dirname, 'xml');
const XML_TARGET_SUBDIR = path.join('app', 'src', 'main', 'res', 'xml');

function withApplicationHardening(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults
    );

    app.$['android:allowBackup'] = 'false';
    app.$['android:usesCleartextTraffic'] = 'false';
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    app.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';
    app.$['android:fullBackupContent'] = '@xml/backup_rules';

    return cfg;
  });
}

function withoutSystemAlertWindow(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (!manifest['uses-permission']) return cfg;

    manifest['uses-permission'] = manifest['uses-permission'].filter(
      (p) => p?.$?.['android:name'] !== 'android.permission.SYSTEM_ALERT_WINDOW'
    );

    return cfg;
  });
}

function withXmlResources(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const targetDir = path.join(
        cfg.modRequest.platformProjectRoot,
        XML_TARGET_SUBDIR
      );
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      for (const filename of [
        'network_security_config.xml',
        'backup_rules.xml',
        'data_extraction_rules.xml',
      ]) {
        const src = path.join(XML_SOURCE_DIR, filename);
        const dst = path.join(targetDir, filename);
        fs.copyFileSync(src, dst);
      }

      return cfg;
    },
  ]);
}

module.exports = function withAndroidSecurityHardening(config) {
  config = withApplicationHardening(config);
  config = withoutSystemAlertWindow(config);
  config = withXmlResources(config);
  return config;
};
