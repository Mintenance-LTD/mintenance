/** @type {import('next').NextConfig} */

// Validate environment variables at build time
// Note: Full validation runs in instrumentation.ts for runtime checks
// This is a simplified check since next.config.js runs before TypeScript compilation
if (process.env.NODE_ENV !== 'test') {
  try {
    // Try to load dotenv if .env.local exists
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }
    // Skip TypeScript file require in config - validation happens at runtime in instrumentation.ts
  } catch (error) {
    // Silently continue - validation will happen at runtime
    console.warn('⚠️  Environment validation will run at runtime');
  }
}

const nextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: ['@mintenance/auth', '@mintenance/shared', '@mintenance/types'],
  
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
    optimizePackageImports: ['@mintenance/shared', '@mintenance/types'],
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
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
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