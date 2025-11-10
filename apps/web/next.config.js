const path = require('path');

// Validate environment variables at build time
// Note: Full validation runs in instrumentation.ts for runtime checks
// This is a simplified check since next.config.js runs before TypeScript compilation
if (process.env.NODE_ENV !== 'test') {
  try {
    // Try to load dotenv if .env.local exists
    const fs = require('fs');
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }
    // Skip TypeScript file require in config - validation happens at runtime in instrumentation.ts
  } catch (error) {
    // The error details should already be logged by lib/env.ts
    // But log the error object as well to ensure it's visible
    if (error instanceof Error && error.message) {
      console.error(error.message);
    }
    console.error('\n❌ Build failed: Environment validation error');
    console.error('   Fix the errors above and try again.\n');
    process.exit(1);
  }
}

const nextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: ['@mintenance/auth', '@mintenance/shared', '@mintenance/types', '@mintenance/shared-ui'],
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 2592000, // 30 days
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
    ],
  },

  // Compression
  compress: true,

  // Bundle optimization
  experimental: {
    optimizePackageImports: ['@mintenance/shared', '@mintenance/types', '@mintenance/shared-ui'],
  },

  // Turbopack configuration (Next.js 16+)
  turbopack: {
    resolveAlias: {
      // Redirect react-native to empty module
      'react-native': path.resolve(__dirname, 'lib/empty-module.js'),
      'react-native$': path.resolve(__dirname, 'lib/empty-module.js'),
      // Redirect native component stubs to empty module (only native files, not unified components)
      '@mintenance/shared-ui/dist/components/Card/Card.native': path.resolve(__dirname, 'lib/empty-module.js'),
      '@mintenance/shared-ui/dist/components/Button/Button.native': path.resolve(__dirname, 'lib/empty-module.js'),
      '@mintenance/shared-ui/dist/components/Input/Input.native': path.resolve(__dirname, 'lib/empty-module.js'),
      '@mintenance/shared-ui/dist/components/Badge/Badge.native': path.resolve(__dirname, 'lib/empty-module.js'),
      '@mintenance/shared-ui/src/components/Card/Card.native': path.resolve(__dirname, 'lib/empty-module.js'),
      '@mintenance/shared-ui/src/components/Button/Button.native': path.resolve(__dirname, 'lib/empty-module.js'),
      '@mintenance/shared-ui/src/components/Input/Input.native': path.resolve(__dirname, 'lib/empty-module.js'),
      '@mintenance/shared-ui/src/components/Badge/Badge.native': path.resolve(__dirname, 'lib/empty-module.js'),
    },
    resolveExtensions: ['.web.js', '.web.jsx', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx'],
    // Ignore React Native files completely - don't even try to parse them
    rules: {
      '*.native.{js,jsx,ts,tsx}': {
        loaders: [],
        as: '*.empty.js',
      },
      // Prevent parsing react-native package entirely
      '**/node_modules/react-native/**': {
        loaders: [],
        as: '*.empty.js',
      },
    },
  },

  // Bundle analyzer (enable with ANALYZE=true)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        );
      }
      return config;
    },
  }),

  // PWA & Service Worker
  webpack: (config, { isServer }) => {
    // Ignore React Native imports in web builds - completely prevent resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      // Completely ignore react-native - don't try to resolve it
      'react-native': false,
      'react-native$': false,
      // Prevent importing native files from shared-ui (both dist and src)
      '@mintenance/shared-ui/dist/components/Card/Card.native': false,
      '@mintenance/shared-ui/dist/components/Button/Button.native': false,
      '@mintenance/shared-ui/dist/components/Input/Input.native': false,
      '@mintenance/shared-ui/dist/components/Badge/Badge.native': false,
      '@mintenance/shared-ui/src/components/Card/Card.native': false,
      '@mintenance/shared-ui/src/components/Button/Button.native': false,
      '@mintenance/shared-ui/src/components/Input/Input.native': false,
      '@mintenance/shared-ui/src/components/Badge/Badge.native': false,
      // Redirect unified components to web versions (prevent any Card.tsx imports)
      '@mintenance/shared-ui/dist/components/Card/Card': '@mintenance/shared-ui/dist/components/Card/Card.web',
      '@mintenance/shared-ui/dist/components/Button/Button': '@mintenance/shared-ui/dist/components/Button/Button.web',
      '@mintenance/shared-ui/dist/components/Input/Input': '@mintenance/shared-ui/dist/components/Input/Input.web',
      '@mintenance/shared-ui/dist/components/Badge/Badge': '@mintenance/shared-ui/dist/components/Badge/Badge.web',
      '@mintenance/shared-ui/src/components/Card/Card': '@mintenance/shared-ui/src/components/Card/Card.web',
      '@mintenance/shared-ui/src/components/Button/Button': '@mintenance/shared-ui/src/components/Button/Button.web',
      '@mintenance/shared-ui/src/components/Input/Input': '@mintenance/shared-ui/src/components/Input/Input.web',
      '@mintenance/shared-ui/src/components/Badge/Badge': '@mintenance/shared-ui/src/components/Badge/Badge.web',
    };

    // Exclude React Native from being parsed - prioritize web extensions
    config.resolve.extensions = [
      '.web.js',
      '.web.jsx',
      '.web.ts',
      '.web.tsx',
      ...config.resolve.extensions.filter(ext => !ext.includes('native')),
    ];

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Ignore react-native module completely - prevent any resolution attempts
    config.externals = config.externals || [];
    // Always ignore react-native, both server and client
    config.externals.push('react-native');
    config.externals.push({
      'react-native': false,
    });

    // Ignore native files and react-native package completely
    // Use IgnorePlugin to prevent webpack from even trying to parse these files
    const webpack = require('webpack');
    config.plugins = config.plugins || [];
    config.plugins.push(
      // Ignore react-native package completely (multiple patterns to catch all cases)
      new webpack.IgnorePlugin({
        resourceRegExp: /^react-native$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^react-native\/.*$/,
      }),
      // Ignore all native files (both in shared-ui and node_modules)
      new webpack.IgnorePlugin({
        resourceRegExp: /\.native\.(js|jsx|ts|tsx|d\.ts)$/,
      }),
      // Ignore native component files specifically
      new webpack.IgnorePlugin({
        resourceRegExp: /Card\.native|Button\.native|Input\.native|Badge\.native/,
      }),
      // Ignore react-native from node_modules (prevent parsing Flow syntax)
      new webpack.IgnorePlugin({
        resourceRegExp: /^react-native$/,
        contextRegExp: /node_modules/,
      }),
      // Ignore usePlatform utility that might import react-native
      new webpack.IgnorePlugin({
        resourceRegExp: /usePlatform/,
        contextRegExp: /shared-ui/,
      }),
      // Ignore react-native index.js file specifically (prevents Flow syntax parsing)
      new webpack.IgnorePlugin({
        resourceRegExp: /react-native\/index\.js$/,
      })
    );

    return config;
  },

  // Security and performance headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    
    // Base security headers (apply in all environments)
    const baseHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=(), payment=(self "https://js.stripe.com")' },
    ];

    // Add CSP (relaxed in development, strict in production)
    if (isDev) {
      // Development CSP - more permissive for hot reload and dev tools
      baseHeaders.push({
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' data: blob: https: https://maps.googleapis.com https://maps.gstatic.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "connect-src 'self' ws: wss: https://*.supabase.co https://api.stripe.com https://maps.googleapis.com http://localhost:*",
          "frame-src https://js.stripe.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      });
    } else {
      // Production CSP - stricter
      baseHeaders.push(
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' https://js.stripe.com https://maps.googleapis.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https: https://maps.googleapis.com https://maps.gstatic.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "connect-src 'self' https://*.supabase.co https://api.stripe.com https://maps.googleapis.com",
            "frame-src https://js.stripe.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests",
          ].join('; '),
        }
      );
    }
    
    return [
      {
        source: '/:path*',
        headers: baseHeaders,
      },
      // Cache static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, must-revalidate',
          },
        ],
      },
      // Service Worker
      {
        source: '/service-worker.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      // PWA Manifest
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;