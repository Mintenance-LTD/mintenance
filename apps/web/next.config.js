const path = require('path');

// Validate environment variables at build time
if (process.env.NODE_ENV !== 'test') {
  try {
    const fs = require('fs');
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }
  } catch (error) {
    if (error instanceof Error && error.message) {
      console.error(error.message);
    }
    console.error('\n❌ Build failed: Environment validation error');
    process.exit(1);
  }
}

const nextConfig = {
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: ['@mintenance/auth', '@mintenance/shared', '@mintenance/types', '@mintenance/shared-ui', '@hookform/resolvers'],

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
    ],
  },

  compress: true,

  experimental: {
    optimizePackageImports: ['@mintenance/shared', '@mintenance/types', '@mintenance/shared-ui'],
    // Turbopack disabled due to HMR issues with @hookform/resolvers
    // Use --no-turbo flag in dev script to ensure webpack is used
  },

  webpack: (config, { isServer }) => {
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, '../../node_modules'),
      path.resolve(__dirname, 'node_modules'),
    ];

    config.resolve.alias = {
      ...config.resolve.alias,
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
    // Externalize onnxruntime-node (native module)
    config.externals.push('onnxruntime-node');
    config.externals.push({ 'onnxruntime-node': 'commonjs onnxruntime-node' });

    if (!isServer) {
      config.externals.push('jsdom');
      config.externals.push({ 'jsdom': false });
    }

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
      ] : []),
      new webpack.IgnorePlugin({ resourceRegExp: /usePlatform/, contextRegExp: /shared-ui/ }),
      new webpack.IgnorePlugin({ resourceRegExp: /react-native\/index\.js$/ })
    );

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

    if (isDev) {
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
      baseHeaders.push(
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
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
      { source: '/:path*', headers: baseHeaders },
      { source: '/_next/static/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/images/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, must-revalidate' }] },
      { source: '/service-worker.js', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] },
      { source: '/manifest.json', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' }] },
    ];
  },
};

module.exports = nextConfig;