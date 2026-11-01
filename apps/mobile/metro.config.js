// Extend Expo's Metro defaults for both local exports and EAS builds.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const defaultConfig = getDefaultConfig(__dirname);
// Preserve support for either Expo API shape; configuration failures must surface.
module.exports =
  defaultConfig && typeof defaultConfig.then === 'function'
    ? defaultConfig.then(extendConfig)
    : extendConfig(defaultConfig);

function extendConfig(baseConfig) {
  const projectRoot = __dirname;
  const monorepoRoot = path.resolve(projectRoot, '../..');

  // Fix: Expo's getDefaultConfig returns projectRoot as '.' which resolves
  // relative to Metro's location in node_modules, not the app directory.
  // Explicitly set it to the absolute app path for monorepo compatibility.
  baseConfig.projectRoot = projectRoot;

  // Note: Do NOT override server.unstable_serverRoot.
  // Expo's default sets it to the monorepo root, which is required so that the
  // bundle URL /apps/mobile/index.bundle resolves correctly against the server root.

  // Ensure proper node_modules resolution for monorepo
  baseConfig.watchFolders = [
    ...new Set([
      ...(baseConfig.watchFolders || []),
      path.join(monorepoRoot, 'packages'),
      path.join(monorepoRoot, 'node_modules'),
    ]),
  ];

  if (!baseConfig.resolver) {
    baseConfig.resolver = {};
  }

  // Keep generated outputs excluded if another tool extends watchFolders.
  // Next.js changes these directories during builds; they are not mobile input.
  const nextBuildDir = /apps[\/\\]web[\/\\]\.next[\/\\].*/;
  // These directories contain generated outputs, dependency caches or duplicate
  // checkouts, never mobile imports. Crawling them can stall local native startup.
  const generatedRoot = monorepoRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const generatedDirectories = new RegExp(
    `^${generatedRoot}[\\\\/](?:audit|\\.pnpm-store|\\.next|\\.claude[\\\\/]worktrees)(?:[\\\\/]|$)`
  );
  const existingBlockList = baseConfig.resolver.blockList;
  baseConfig.resolver.blockList = Array.isArray(existingBlockList)
    ? [...existingBlockList, nextBuildDir, generatedDirectories]
    : existingBlockList
      ? [existingBlockList, nextBuildDir, generatedDirectories]
      : [nextBuildDir, generatedDirectories];
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
    baseConfig.resolver.resolverMainFields = [
      'react-native',
      'browser',
      'main',
    ];
  } else if (!baseConfig.resolver.resolverMainFields.includes('react-native')) {
    baseConfig.resolver.resolverMainFields.unshift('react-native');
  }

  // Ensure .ts and .tsx extensions are resolved from monorepo packages
  const defaultSourceExts = baseConfig.resolver.sourceExts || [
    'js',
    'jsx',
    'json',
    'ts',
    'tsx',
  ];
  if (!defaultSourceExts.includes('ts')) {
    defaultSourceExts.push('ts');
  }
  if (!defaultSourceExts.includes('tsx')) {
    defaultSourceExts.push('tsx');
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
      if (
        req.url &&
        req.url.includes('.bundle') &&
        req.headers &&
        req.headers.accept
      ) {
        req.headers.accept =
          req.headers.accept.replace(/multipart\/mixed,?\s*/g, '').trim() ||
          '*/*';
      }
      return middleware(req, res, next);
    };
  };

  return baseConfig;
}
