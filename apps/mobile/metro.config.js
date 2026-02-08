// Metro config for monorepo - works with EAS builds
// EAS builds use their own metro version on servers, so this config is mainly for local validation
const path = require('path');

let config;

try {
  // Try to load Expo's default config
  const { getDefaultConfig } = require('expo/metro-config');
  
  // Handle both sync and async getDefaultConfig
  const defaultConfig = getDefaultConfig(__dirname);
  
  if (defaultConfig && typeof defaultConfig.then === 'function') {
    // Async version - return promise for EAS
    module.exports = defaultConfig.then(config => {
      return extendConfig(config);
    });
  } else {
    // Sync version
    config = extendConfig(defaultConfig);
    module.exports = config;
  }
} catch (error) {
  // If we can't load expo/metro-config (e.g., due to version mismatch),
  // provide a minimal config that should work for EAS validation
  // EAS will use its own metro config during the actual build
  // Silently fallback - EAS will use its own metro config during builds
  module.exports = getMinimalConfig();
}

function extendConfig(baseConfig) {
  const projectRoot = __dirname;
  const monorepoRoot = path.resolve(projectRoot, '../..');

  // Ensure proper node_modules resolution for monorepo
  baseConfig.watchFolders = [monorepoRoot];

  if (!baseConfig.resolver) {
    baseConfig.resolver = {};
  }
  if (!baseConfig.resolver.nodeModulesPaths) {
    baseConfig.resolver.nodeModulesPaths = [];
  }

  const projectModules = path.resolve(projectRoot, 'node_modules');
  const monorepoModules = path.resolve(monorepoRoot, 'node_modules');

  if (!baseConfig.resolver.nodeModulesPaths.includes(projectModules)) {
    baseConfig.resolver.nodeModulesPaths.push(projectModules);
  }
  if (!baseConfig.resolver.nodeModulesPaths.includes(monorepoModules)) {
    baseConfig.resolver.nodeModulesPaths.push(monorepoModules);
  }

  // Ensure Metro resolves the react-native field in package.json
  // This is critical for monorepo packages like @mintenance/ai-core that
  // point react-native to TypeScript source instead of compiled dist/
  if (!baseConfig.resolver.resolverMainFields) {
    baseConfig.resolver.resolverMainFields = ["react-native", "browser", "main"];
  } else if (!baseConfig.resolver.resolverMainFields.includes("react-native")) {
    baseConfig.resolver.resolverMainFields.unshift("react-native");
  }

  // Ensure .ts and .tsx extensions are resolved from monorepo packages
  const defaultSourceExts = baseConfig.resolver.sourceExts || ["js", "jsx", "json", "ts", "tsx"];
  if (!defaultSourceExts.includes("ts")) {
    defaultSourceExts.push("ts");
  }
  if (!defaultSourceExts.includes("tsx")) {
    defaultSourceExts.push("tsx");
  }
  baseConfig.resolver.sourceExts = defaultSourceExts;

  return baseConfig;
}

function getMinimalConfig() {
  return {
    watchFolders: [path.resolve(__dirname, '../..')],
    resolver: {
      resolverMainFields: ["react-native", "browser", "main"],
      sourceExts: ["js", "jsx", "json", "ts", "tsx"],
      nodeModulesPaths: [
        path.resolve(__dirname, 'node_modules'),
        path.resolve(__dirname, '../../node_modules'),
      ],
    },
  };
}
