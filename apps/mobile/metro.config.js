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

  // Fix: Expo's getDefaultConfig returns projectRoot as '.' which resolves
  // relative to Metro's location in node_modules, not the app directory.
  // Explicitly set it to the absolute app path for monorepo compatibility.
  baseConfig.projectRoot = projectRoot;

  // Note: Do NOT override server.unstable_serverRoot.
  // Expo's default sets it to the monorepo root, which is required for:
  // 1. The dev client's .expo/.virtual-metro-entry URL to resolve correctly
  // 2. Compatibility with the native build's entry point configuration
  // The "main" field in package.json (index.ts) ensures correct entry resolution.

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

  // Intercept Node.js-only modules that get pulled into the bundle via shared packages.
  // @mintenance/security statically imports WebSanitizer which requires jsdom (Node-only),
  // but MobileSanitizer is used at runtime on React Native, so the mock is never called.
  const originalResolveRequest = baseConfig.resolver.resolveRequest;
  baseConfig.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'jsdom') {
      return {
        filePath: path.resolve(projectRoot, '__mocks__/jsdom.js'),
        type: 'sourceFile',
      };
    }
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };

  // Workaround for React Native's BundleDownloader multipart stream parsing error on Windows.
  // The native client sends Accept: multipart/mixed, causing Metro to wrap the bundle in a
  // multipart response with chunked encoding. OkHttp's chunk decoder conflicts with the
  // multipart parser, producing: "Expected leading [0-9a-fA-F] character but was 0xd".
  // Stripping the Accept header forces Metro to send a plain application/javascript response.
  if (!baseConfig.server) {
    baseConfig.server = {};
  }
  const originalEnhanceMiddleware = baseConfig.server.enhanceMiddleware;
  baseConfig.server.enhanceMiddleware = (metroMiddleware, metroServer) => {
    const middleware = originalEnhanceMiddleware
      ? originalEnhanceMiddleware(metroMiddleware, metroServer)
      : metroMiddleware;
    return (req, res, next) => {
      if (req.url && req.url.includes('.bundle') && req.headers && req.headers.accept) {
        req.headers.accept = req.headers.accept.replace(/multipart\/mixed,?\s*/g, '').trim() || '*/*';
      }
      return middleware(req, res, next);
    };
  };

  return baseConfig;
}

function getMinimalConfig() {
  return {
    projectRoot: __dirname,
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
