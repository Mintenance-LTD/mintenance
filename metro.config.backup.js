const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration for Mintenance App
 * Optimized for performance, bundle splitting, and tree shaking
 */
const config = {
  // ============================================================================
  // RESOLVER CONFIGURATION
  // ============================================================================
  resolver: {
    // Asset extensions for bundling
    assetExts: [
      'bin', 'txt', 'jpg', 'png', 'json', 'gif', 'webp', 'mp4', 'mov',
      'svg', 'ttf', 'otf', 'woff', 'woff2', 'eot',
    ],

    // Source extensions for bundling
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],

    // Platform-specific extensions
    platforms: ['ios', 'android', 'web'],

    // Alias resolution for cleaner imports
    alias: {
      '@': './src',
      '@components': './src/components',
      '@screens': './src/screens',
      '@services': './src/services',
      '@utils': './src/utils',
      '@hooks': './src/hooks',
      '@types': './src/types',
      '@assets': './src/assets',
      '@config': './src/config',
      '@design-system': './src/design-system',
    },

    // Node modules to resolve for better compatibility
    resolverMainFields: ['react-native', 'browser', 'main'],

    // Blacklist problematic modules
    blacklistRE: /.*\/__tests__\/.*/,
  },

  // ============================================================================
  // TRANSFORMER CONFIGURATION
  // ============================================================================
  transformer: {
    // Enable Hermes for better performance
    hermesCommand: 'hermes',

    // Minification settings
    minifierConfig: {
      // Use Terser for better minification
      mangle: {
        toplevel: true,
        keep_fnames: false,
      },
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log'] : [],
        passes: 3,
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
      },
      output: {
        comments: false,
        beautify: process.env.NODE_ENV === 'development',
      },
    },

    // SVG transformation
    babelTransformerPath: require.resolve('react-native-svg-transformer'),

    // Asset transformation
    assetRegistryPath: 'react-native/Libraries/Image/AssetRegistry',

    // Enable experimental features
    experimentalImportSupport: true,
    inlineRequires: true,
  },

  // ============================================================================
  // SERIALIZER CONFIGURATION (Bundle Optimization)
  // ============================================================================
  serializer: {
    // Custom module filter for tree shaking
    createModuleIdFactory: () => (path) => {
      // Create deterministic module IDs for better caching
      const crypto = require('crypto');
      return crypto.createHash('sha1').update(path).digest('hex').substr(0, 8);
    },

    // Custom serializer for bundle splitting
    customSerializer: process.env.NODE_ENV === 'production'
      ? require('./tools/bundle-splitter')
      : undefined,

    // Optimize module ordering
    processModuleFilter: (module) => {
      // Filter out test files and dev dependencies
      if (module.path.includes('__tests__')) return false;
      if (module.path.includes('react-native-debugger')) return false;
      if (module.path.includes('flipper')) return false;

      return true;
    },

    // Source map configuration
    getSourceMapInfo: () => ({
      shouldInlineSourceMap: process.env.NODE_ENV === 'development',
    }),
  },

  // ============================================================================
  // METRO CACHE CONFIGURATION
  // ============================================================================
  cacheStores: [
    {
      name: 'FileStore',
      options: {
        root: '.metro-cache',
        // Increase cache size for better performance
        maxFileSize: 1024 * 1024 * 100, // 100MB
      },
    },
  ],

  // Reset cache more frequently in development
  resetCache: process.env.NODE_ENV === 'development',

  // ============================================================================
  // PERFORMANCE OPTIMIZATIONS
  // ============================================================================
  watchFolders: [
    // Add additional folders to watch for changes
    './src',
    './assets',
    './node_modules/@react-native-async-storage/async-storage/src',
  ],

  // Maximum workers for parallel processing
  maxWorkers: require('os').cpus().length,

  // Enable experimental features for better performance
  reporter: {
    update: (event) => {
      // Custom progress reporting for development
      if (process.env.NODE_ENV === 'development' && event.type === 'bundle_build_done') {
        console.log(`Bundle built in ${event.buildTime}ms`);
      }
    },
  },

  // ============================================================================
  // BUNDLE SPLITTING CONFIGURATION
  // ============================================================================
  unstable_allowRequireContext: true,

  // Custom module resolution for better splitting
  resolver: {
    ...config.resolver,
    resolveRequest: (context, moduleName, platform) => {
      // Custom resolution logic for dynamic imports
      if (moduleName.startsWith('screens/')) {
        // Lazy load screens for better performance
        return {
          filePath: `./src/${moduleName}.tsx`,
          type: 'sourceFile',
        };
      }

      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

// ============================================================================
// ENVIRONMENT-SPECIFIC OVERRIDES
// ============================================================================

if (process.env.NODE_ENV === 'production') {
  // Production optimizations
  config.transformer.minifierConfig.compress.drop_console = true;
  config.transformer.minifierConfig.compress.drop_debugger = true;
  config.transformer.minifierConfig.mangle.keep_fnames = false;

  // Enable more aggressive optimizations
  config.transformer.minifierConfig.compress.passes = 5;
  config.transformer.minifierConfig.compress.pure_funcs = [
    'console.log',
    'console.info',
    'console.debug',
    'console.warn',
  ];

  // Bundle splitting for production
  config.serializer.splitBundles = true;
  config.serializer.bundleRules = [
    {
      test: /node_modules\/(react|react-native)\//,
      name: 'vendor',
      priority: 10,
    },
    {
      test: /src\/components\/ui\//,
      name: 'ui',
      priority: 5,
    },
    {
      test: /src\/screens\//,
      name: 'screens',
      priority: 1,
      chunks: 'async', // Lazy load screens
    },
  ];
} else {
  // Development optimizations
  config.transformer.minifierConfig.output.beautify = true;
  config.transformer.minifierConfig.compress.drop_console = false;

  // Faster rebuilds in development
  config.serializer.createModuleIdFactory = () => (path) => path;
  config.cacheStores[0].options.maxFileSize = 1024 * 1024 * 50; // 50MB for dev
}

// ============================================================================
// PLATFORM-SPECIFIC CONFIGURATIONS
// ============================================================================

const platformConfigs = {
  ios: {
    // iOS-specific optimizations
    transformer: {
      ...config.transformer,
      assetPlugins: ['react-native-asset-plugin-ios'],
    },
  },
  android: {
    // Android-specific optimizations
    transformer: {
      ...config.transformer,
      assetPlugins: ['react-native-asset-plugin-android'],
    },
  },
};

// Apply platform-specific config if specified
if (process.env.PLATFORM && platformConfigs[process.env.PLATFORM]) {
  Object.assign(config, platformConfigs[process.env.PLATFORM]);
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

const originalCreateModuleIdFactory = config.serializer.createModuleIdFactory;
config.serializer.createModuleIdFactory = () => {
  const createId = originalCreateModuleIdFactory();
  const moduleIds = new Map();
  let bundleSize = 0;

  return (path) => {
    const id = createId(path);
    moduleIds.set(id, path);

    // Track bundle size in development
    if (process.env.NODE_ENV === 'development') {
      bundleSize += Buffer.byteLength(path, 'utf8');

      // Warn about large bundles
      if (bundleSize > 20 * 1024 * 1024) { // 20MB
        console.warn('⚠️  Bundle size exceeding 20MB, consider code splitting');
      }
    }

    return id;
  };
};

// ============================================================================
// EXPORT MERGED CONFIGURATION
// ============================================================================

module.exports = getDefaultConfig(__dirname);