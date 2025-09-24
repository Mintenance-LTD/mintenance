const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration for Mintenance App
 * Optimized for performance, bundle splitting, and tree shaking
 */
const config = getDefaultConfig(__dirname);

// ============================================================================
// RESOLVER CONFIGURATION
// ============================================================================
config.resolver.assetExts.push(
  'bin', 'txt', 'jpg', 'png', 'json', 'gif', 'webp', 'mp4', 'mov',
  'svg', 'ttf', 'otf', 'woff', 'woff2', 'eot'
);

config.resolver.sourceExts.push('js', 'jsx', 'ts', 'tsx', 'json');

// Alias resolution for cleaner imports
config.resolver.alias = {
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
  // Force React version consistency to fix blank screen issue
  'react': require.resolve('react'),
  'react-dom': require.resolve('react-dom'),
  'react-native-web': require.resolve('react-native-web'),
};

// Platform-specific resolver for web compatibility
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// ============================================================================
// TRANSFORMER CONFIGURATION
// ============================================================================
// Minification settings for production
if (process.env.NODE_ENV === 'production') {
  config.transformer.minifierConfig = {
    mangle: {
      toplevel: true,
      keep_fnames: false,
    },
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
      passes: 3,
      unsafe: true,
      unsafe_comps: true,
      unsafe_math: true,
      unsafe_methods: true,
    },
    output: {
      comments: false,
      beautify: false,
    },
  };
}

// Enable experimental features
config.transformer.experimentalImportSupport = true;
config.transformer.inlineRequires = true;

// ============================================================================
// SERIALIZER CONFIGURATION (Bundle Optimization)
// ============================================================================
config.serializer.createModuleIdFactory = () => (path) => {
  if (process.env.NODE_ENV === 'production') {
    // Create deterministic module IDs for better caching
    const crypto = require('crypto');
    return crypto.createHash('sha1').update(path).digest('hex').substr(0, 8);
  }
  return path; // Use full path in development for easier debugging
};

// Filter out test files and dev dependencies
config.serializer.processModuleFilter = (module) => {
  if (module.path.includes('__tests__')) return false;
  if (module.path.includes('react-native-debugger')) return false;
  if (module.path.includes('flipper')) return false;
  return true;
};

// ============================================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================================
config.watchFolders = [
  './src',
  './assets',
];

// Maximum workers for parallel processing
config.maxWorkers = require('os').cpus().length;

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================
// Use default cache configuration to avoid store.get errors
// config.cacheStores = [
//   {
//     name: 'FileStore',
//     options: {
//       root: '.metro-cache',
//       maxFileSize: process.env.NODE_ENV === 'production'
//         ? 1024 * 1024 * 100  // 100MB for production
//         : 1024 * 1024 * 50,  // 50MB for development
//     },
//   },
// ];

// Reset cache in development for consistency
config.resetCache = process.env.NODE_ENV === 'development';

// ============================================================================
// ENABLE BUNDLE SPLITTING FEATURES
// ============================================================================
// config.unstable_allowRequireContext = true; // Disabled to avoid validation warning

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================
const originalCreateModuleIdFactory = config.serializer.createModuleIdFactory;
config.serializer.createModuleIdFactory = () => {
  const createId = originalCreateModuleIdFactory();
  let bundleSize = 0;

  return (path) => {
    const id = createId(path);

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

// Custom reporter for build performance
config.reporter = {
  update: (event) => {
    if (process.env.NODE_ENV === 'development' && event.type === 'bundle_build_done') {
      console.log(`✅ Bundle built in ${event.buildTime}ms`);

      // Performance budget check
      if (event.buildTime > 30000) { // 30 seconds
        console.warn('⚠️  Build time exceeds 30s, consider optimizing');
      }
    }
  },
};

module.exports = config;