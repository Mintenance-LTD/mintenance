const path = require('path');

// Enable bundle analyzer when ANALYZE env is set
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Validate environment variables at build time
if (process.env.NODE_ENV !== 'test') {
  try {
    const fs = require('fs');
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }
  } catch (error) {
    console.error('Build failed: Environment validation error', error);
    process.exit(1);
  }
}

const nextConfig = {
  // NOTE: output: 'standalone' removed — Vercel has its own serverless function
  // packaging pipeline and standalone mode interferes with it, causing all
  // serverless functions to crash on cold start with no runtime logs.

  // Required for monorepo: trace from repo root to include workspace packages
  outputFileTracingRoot: path.join(__dirname, '../../'),

  // Exclude heavy packages from serverless function bundle to stay under 250MB
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/@esbuild',
      'node_modules/esbuild',
      'node_modules/puppeteer',
      'node_modules/puppeteer-core',
      'node_modules/canvas',
      'node_modules/jsdom',
      'node_modules/@google-cloud',
      'node_modules/onnxruntime-node',
      'node_modules/onnxruntime-web',
      'node_modules/typescript',
      'node_modules/webpack',
      'node_modules/terser',
    ],
  },

  poweredByHeader: false,

  // swcMinify is now default in Next.js 16, no need to specify

  typescript: {
    ignoreBuildErrors: false,
  },

  transpilePackages: ['@mintenance/auth', '@mintenance/shared', '@mintenance/types', '@mintenance/shared-ui', '@mintenance/design-tokens', '@mintenance/ai-core', '@hookform/resolvers'],

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 2592000,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'via.placeholder.com', pathname: '/**' },
      { protocol: 'https', hostname: 'ui-avatars.com', pathname: '/api/**' },
    ],
  },

  compress: true,

  // Server external packages moved from experimental as per Next.js 16
  serverExternalPackages: [
    '@google-cloud/vision',
    '@google-cloud/storage',
    '@google-cloud/aiplatform',
    'onnxruntime-node',
    'sharp',
    'jsdom',
    'puppeteer',
    'puppeteer-core',
    'canvas',
    'pdf-parse'
  ],

  experimental: {
    // Optimize imports for faster builds and smaller bundles
    optimizePackageImports: [
      '@mintenance/shared',
      '@mintenance/types',
      '@mintenance/shared-ui',
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'recharts',
      'date-fns',
      'react-hook-form',
      '@tanstack/react-query'
    ],
  },

  // Modularize imports for tree shaking
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
    '@radix-ui/react-icons': {
      transform: '@radix-ui/react-icons/dist/{{member}}',
    },
  },

  // Empty turbopack config to silence Next.js 16 warning
  // We're using webpack explicitly via --webpack flag
  turbopack: {},

  webpack: (config, { isServer, dev }) => {
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, '../../node_modules'),
      path.resolve(__dirname, 'node_modules'),
    ];

    // Resolve @mintenance packages from source for monorepo builds
    // This avoids needing pre-built dist/ directories
    // Subpath aliases must come before bare package aliases (webpack matches first hit)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@mintenance/ai-core/types': path.resolve(__dirname, '../../packages/ai-core/src/types/index.ts'),
      '@mintenance/design-tokens/src/unified-tokens': path.resolve(__dirname, '../../packages/design-tokens/src/unified-tokens.ts'),
      '@mintenance/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@mintenance/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@mintenance/auth': path.resolve(__dirname, '../../packages/auth/src/index.ts'),
      '@mintenance/shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src/index.ts'),
      '@mintenance/design-tokens': path.resolve(__dirname, '../../packages/design-tokens/src/index.ts'),
      '@mintenance/ai-core': path.resolve(__dirname, '../../packages/ai-core/src/index.ts'),
      'react-native': false,
      'react-native$': false,
      '@mintenance/shared-ui/dist/components/Card/Card.native': false,
      '@mintenance/shared-ui/dist/components/Button/Button.native': false,
      '@mintenance/shared-ui/dist/components/Input/Input.native': false,
      '@mintenance/shared-ui/dist/components/Badge/Badge.native': false,
      '@mintenance/shared-ui/src/components/Card/Card.native': false,
      '@mintenance/shared-ui/src/components/Button/Button.native': false,
      '@mintenance/shared-ui/src/components/Input/Input.native': false,
      '@mintenance/shared-ui/src/components/Badge/Badge.native': false,
      '@mintenance/shared-ui/dist/components/Card/Card': '@mintenance/shared-ui/dist/components/Card/Card.web',
      '@mintenance/shared-ui/dist/components/Button/Button': '@mintenance/shared-ui/dist/components/Button/Button.web',
      '@mintenance/shared-ui/dist/components/Input/Input': '@mintenance/shared-ui/dist/components/Input/Input.web',
      '@mintenance/shared-ui/dist/components/Badge/Badge': '@mintenance/shared-ui/dist/components/Badge/Badge.web',
      '@mintenance/shared-ui/src/components/Card/Card': '@mintenance/shared-ui/src/components/Card/Card.web',
      '@mintenance/shared-ui/src/components/Button/Button': '@mintenance/shared-ui/src/components/Button/Button.web',
      '@mintenance/shared-ui/src/components/Input/Input': '@mintenance/shared-ui/src/components/Input/Input.web',
      '@mintenance/shared-ui/src/components/Badge/Badge': '@mintenance/shared-ui/src/components/Badge/Badge.web',
    };

    config.resolve.extensions = [
      '.web.js', '.web.jsx', '.web.ts', '.web.tsx',
      ...config.resolve.extensions.filter(ext => !ext.includes('native')),
    ];

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    config.externals = config.externals || [];
    // Always ignore react-native, both server and client
    config.externals.push('react-native');
    config.externals.push({ 'react-native': false });

    // Handle onnxruntime differently for server and client
    if (isServer) {
      // Externalize onnxruntime-node on server (native module)
      config.externals.push('onnxruntime-node');
      config.externals.push({ 'onnxruntime-node': 'commonjs onnxruntime-node' });
      // Also externalize onnxruntime-web on server (not needed server-side)
      config.externals.push('onnxruntime-web');
      config.externals.push({ 'onnxruntime-web': 'commonjs onnxruntime-web' });
      // Externalize Google Cloud libraries on server
      config.externals.push('@google-cloud/vision');
      config.externals.push('@google-cloud/storage');
      config.externals.push('@google-cloud/aiplatform');
      // Externalize argon2 (optional password hashing library)
      config.externals.push('argon2');
      config.externals.push({ 'argon2': 'commonjs argon2' });
    } else {
      // Client-side: Configure for onnxruntime-web
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-node': false,
        '@google-cloud/vision': false,
        '@google-cloud/storage': false,
        '@google-cloud/aiplatform': false,
        'argon2': false,
      };
    }

    if (!isServer) {
      config.externals.push('jsdom');
      config.externals.push({ 'jsdom': false });
    }

    // Optimize bundle splitting for production
    // Reduced maxAsyncRequests and maxInitialRequests to reduce chunk loading failures
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        runtimeChunk: 'single',
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          // Reduced from 30 to 20 to minimize chunk loading errors
          maxAsyncRequests: 20,
          maxInitialRequests: 20,
          // Increased min sizes to create fewer, larger chunks
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-sync-external-store)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Libraries chunk
            lib: {
              test(module) {
                return module.size() > 160000 &&
                  /node_modules[\\/]/.test(module.identifier());
              },
              name(module) {
                const hash = require('crypto').createHash('sha1');
                hash.update(module.identifier());
                return `lib-${hash.digest('hex').substring(0, 8)}`;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Common chunk for shared modules
            commons: {
              name: 'commons',
              chunks: 'initial',
              minChunks: 2,
              priority: 20,
            },
            // Shared UI components
            shared: {
              name: 'shared',
              test: /[\\/]packages[\\/](shared|shared-ui|types|auth)[\\/]/,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Use memory cache for both development and production
    // to avoid webpack configuration errors
    config.cache = {
      type: 'memory',
      maxGenerations: 1
    };

    const webpack = require('webpack');
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^react-native$/ }),
      new webpack.IgnorePlugin({ resourceRegExp: /^react-native\/.*$/ }),
      new webpack.IgnorePlugin({ resourceRegExp: /\.native\.(js|jsx|ts|tsx|d\.ts)$/ }),
      new webpack.IgnorePlugin({ resourceRegExp: /Card\.native|Button\.native|Input\.native|Badge\.native/ }),
      new webpack.IgnorePlugin({ resourceRegExp: /^react-native$/, contextRegExp: /node_modules/ }),
      ...(!isServer ? [
        new webpack.IgnorePlugin({ resourceRegExp: /^jsdom$/ }),
        new webpack.IgnorePlugin({ resourceRegExp: /^jsdom\/.*$/ }),
        new webpack.IgnorePlugin({ resourceRegExp: /^@google-cloud\/.*$/ }),
      ] : []),
      new webpack.IgnorePlugin({ resourceRegExp: /usePlatform/, contextRegExp: /shared-ui/ }),
      new webpack.IgnorePlugin({ resourceRegExp: /react-native\/index\.js$/ })
    );

    // Add webpack bundle analyzer in production
    if (!dev && !isServer && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './analyze.html',
          openAnalyzer: true,
        })
      );
    }

    return config;
  },

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const baseHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=(), payment=(self "https://js.stripe.com")' },
    ];

    // CSP is handled by middleware.ts (supports nonce for authenticated routes)
    // Only add HSTS here (not CSP) to avoid duplicate/conflicting CSP headers
    if (!isDev) {
      baseHeaders.push(
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      );
    }

    return [
      { source: '/:path*', headers: baseHeaders },
      { source: '/_next/static/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/images/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, must-revalidate' }] },
      { source: '/service-worker.js', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] },
      { source: '/manifest.json', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' }] },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);