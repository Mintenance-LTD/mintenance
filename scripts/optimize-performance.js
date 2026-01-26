#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { execSync } = require('child_process');

// Performance optimization configuration
const optimizations = {
  bundleSize: {
    target: 500000, // 500KB target for initial bundle
    critical: 750000, // 750KB critical threshold
  },
  images: {
    formats: ['webp', 'avif'],
    sizes: [640, 750, 828, 1080, 1200],
  },
  caching: {
    static: 31536000, // 1 year for static assets
    api: 0, // No cache for API routes
    pages: 3600, // 1 hour for pages
  },
};

let report = {
  currentBundleSize: 0,
  largeModules: [],
  unusedDependencies: [],
  imageOptimizations: [],
  lazyLoadOpportunities: [],
  cacheableAssets: [],
  recommendations: [],
};

// Analyze bundle size
function analyzeBundleSize() {
  console.log('📊 Analyzing bundle size...\n');

  try {
    // Build and analyze
    execSync('cd apps/web && ANALYZE=true npm run build', {
      stdio: 'ignore',
    });

    // Check .next directory for bundle stats
    const statsPath = path.join('apps/web', '.next', 'build-manifest.json');
    if (fs.existsSync(statsPath)) {
      const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

      // Analyze pages
      Object.entries(stats.pages || {}).forEach(([page, assets]) => {
        const totalSize = assets.reduce((acc, asset) => {
          const assetPath = path.join('apps/web', '.next', asset);
          if (fs.existsSync(assetPath)) {
            return acc + fs.statSync(assetPath).size;
          }
          return acc;
        }, 0);

        if (totalSize > optimizations.bundleSize.target) {
          report.largeModules.push({
            page,
            size: totalSize,
            assets: assets.length,
          });
        }
      });
    }

    console.log(`✅ Found ${report.largeModules.length} pages exceeding target size\n`);
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
  }
}

// Find components that can be lazy loaded
function findLazyLoadOpportunities() {
  console.log('🔍 Finding lazy load opportunities...\n');

  const componentFiles = glob.sync('apps/web/**/*.{tsx,jsx}', {
    ignore: ['**/node_modules/**', '**/.next/**'],
  });

  componentFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');

    // Check for heavy components that aren't lazy loaded
    if (
      content.includes('import') &&
      !content.includes('lazy(') &&
      !content.includes('dynamic(')
    ) {
      // Look for large components
      const lines = content.split('\n').length;
      if (lines > 200) {
        // Check if it's not a page component
        if (!file.includes('/pages/') && !file.includes('/app/')) {
          report.lazyLoadOpportunities.push({
            file: path.relative('apps/web', file),
            lines,
            type: 'component',
          });
        }
      }

      // Look for heavy libraries
      const heavyLibs = [
        'react-select',
        'react-datepicker',
        'react-quill',
        'chart.js',
        'moment',
        'lodash',
        'd3',
        'three',
      ];

      heavyLibs.forEach(lib => {
        if (content.includes(`from '${lib}'`) || content.includes(`from "${lib}"`)) {
          report.lazyLoadOpportunities.push({
            file: path.relative('apps/web', file),
            library: lib,
            type: 'library',
          });
        }
      });
    }
  });

  console.log(`✅ Found ${report.lazyLoadOpportunities.length} lazy load opportunities\n`);
}

// Check for unoptimized images
function checkImageOptimization() {
  console.log('🖼️  Checking image optimization...\n');

  const imageFiles = glob.sync('apps/web/public/**/*.{jpg,jpeg,png,gif}', {
    ignore: ['**/node_modules/**'],
  });

  imageFiles.forEach(file => {
    const stats = fs.statSync(file);
    const sizeInKB = stats.size / 1024;

    if (sizeInKB > 100) {
      report.imageOptimizations.push({
        file: path.relative('apps/web/public', file),
        size: `${Math.round(sizeInKB)}KB`,
        recommendation: sizeInKB > 500 ? 'Critical: Compress or use next/image' : 'Consider optimization',
      });
    }
  });

  console.log(`✅ Found ${report.imageOptimizations.length} images needing optimization\n`);
}

// Generate optimization components
function generateOptimizedComponents() {
  console.log('🔧 Generating optimized components...\n');

  // Generate lazy loading wrapper
  const lazyLoadWrapper = `import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load heavy components
export const LazyComponent = dynamic(
  () => import('./HeavyComponent'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded" />,
    ssr: false, // Disable SSR for heavy client-only components
  }
);

// With Suspense boundary
export function LazyWithSuspense({ componentPath }: { componentPath: string }) {
  const Component = dynamic(() => import(componentPath));

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Component />
    </Suspense>
  );
}
`;

  fs.writeFileSync(
    'apps/web/components/optimized/LazyLoadWrapper.tsx',
    lazyLoadWrapper
  );

  // Generate image optimization component
  const optimizedImage = `import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={\`relative \${className}\`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
        onLoad={() => setIsLoading(false)}
        className={\`
          duration-700 ease-in-out
          \${isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0'}
        \`}
      />
    </div>
  );
}
`;

  fs.writeFileSync(
    'apps/web/components/optimized/OptimizedImage.tsx',
    optimizedImage
  );

  // Generate performance monitoring hook
  const performanceHook = `import { useEffect, useCallback } from 'react';

export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    // Mark when component mounts
    performance.mark(\`\${componentName}-mount-start\`);

    // Report Web Vitals
    if ('web-vital' in window) {
      const reportWebVital = ({ name, value }: any) => {
        console.log(\`[\${componentName}] \${name}: \${value}\`);

        // Send to analytics
        if (window.gtag) {
          window.gtag('event', name, {
            event_category: 'Web Vitals',
            event_label: componentName,
            value: Math.round(value),
            non_interaction: true,
          });
        }
      };

      // @ts-ignore
      window.addEventListener('web-vital', reportWebVital);
      return () => window.removeEventListener('web-vital', reportWebVital);
    }

    return () => {
      performance.mark(\`\${componentName}-mount-end\`);
      performance.measure(
        \`\${componentName}-mount\`,
        \`\${componentName}-mount-start\`,
        \`\${componentName}-mount-end\`
      );
    };
  }, [componentName]);

  const measureInteraction = useCallback((interactionName: string) => {
    const startMark = \`\${componentName}-\${interactionName}-start\`;
    const endMark = \`\${componentName}-\${interactionName}-end\`;

    performance.mark(startMark);

    return () => {
      performance.mark(endMark);
      performance.measure(\`\${componentName}-\${interactionName}\`, startMark, endMark);

      const measure = performance.getEntriesByName(\`\${componentName}-\${interactionName}\`)[0];
      if (measure) {
        console.log(\`[\${componentName}] \${interactionName}: \${measure.duration}ms\`);
      }
    };
  }, [componentName]);

  return { measureInteraction };
}
`;

  fs.writeFileSync(
    'apps/web/hooks/usePerformanceMonitor.ts',
    performanceHook
  );

  console.log('✅ Generated optimized components\n');
}

// Generate performance recommendations
function generateRecommendations() {
  // Bundle size recommendations
  if (report.largeModules.length > 0) {
    report.recommendations.push({
      category: 'Bundle Size',
      priority: 'High',
      items: [
        'Implement code splitting for large pages',
        'Use dynamic imports for heavy components',
        'Consider removing unused dependencies',
        'Enable tree shaking in webpack config',
      ],
    });
  }

  // Lazy loading recommendations
  if (report.lazyLoadOpportunities.length > 5) {
    report.recommendations.push({
      category: 'Lazy Loading',
      priority: 'Medium',
      items: [
        'Convert heavy components to lazy loaded',
        'Use React.lazy() or next/dynamic',
        'Implement intersection observer for below-fold content',
        'Defer non-critical JavaScript',
      ],
    });
  }

  // Image optimization recommendations
  if (report.imageOptimizations.length > 0) {
    report.recommendations.push({
      category: 'Images',
      priority: 'High',
      items: [
        'Convert images to WebP/AVIF format',
        'Use next/image component for automatic optimization',
        'Implement responsive images with srcset',
        'Add lazy loading for below-fold images',
      ],
    });
  }

  // Caching recommendations
  report.recommendations.push({
    category: 'Caching',
    priority: 'Medium',
    items: [
      'Implement Service Worker for offline support',
      'Add Cache-Control headers for static assets',
      'Use SWR or React Query for data caching',
      'Enable CDN for static assets',
    ],
  });
}

// Generate Web Vitals monitoring
function generateWebVitalsMonitoring() {
  const webVitalsCode = `import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

const vitalsUrl = 'https://vitals.vercel-analytics.com/v1/vitals';

function sendToAnalytics(metric: any) {
  const body = JSON.stringify({
    dsn: process.env.NEXT_PUBLIC_ANALYTICS_ID,
    id: metric.id,
    page: window.location.pathname,
    href: window.location.href,
    event_name: metric.name,
    value: metric.value.toString(),
    speed: navigator.connection?.effectiveType || '',
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(vitalsUrl, body);
  } else {
    fetch(vitalsUrl, {
      body,
      method: 'POST',
      credentials: 'omit',
      keepalive: true,
    });
  }
}

export function reportWebVitals(metric: any) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric);
  }

  // Send to analytics
  sendToAnalytics(metric);

  // Report to performance monitoring service
  switch (metric.name) {
    case 'FCP':
      // First Contentful Paint
      if (metric.value > 1800) {
        console.warn('FCP is above target (1.8s):', metric.value);
      }
      break;
    case 'LCP':
      // Largest Contentful Paint
      if (metric.value > 2500) {
        console.warn('LCP is above target (2.5s):', metric.value);
      }
      break;
    case 'CLS':
      // Cumulative Layout Shift
      if (metric.value > 0.1) {
        console.warn('CLS is above target (0.1):', metric.value);
      }
      break;
    case 'FID':
      // First Input Delay
      if (metric.value > 100) {
        console.warn('FID is above target (100ms):', metric.value);
      }
      break;
    case 'TTFB':
      // Time to First Byte
      if (metric.value > 600) {
        console.warn('TTFB is above target (600ms):', metric.value);
      }
      break;
    case 'INP':
      // Interaction to Next Paint
      if (metric.value > 200) {
        console.warn('INP is above target (200ms):', metric.value);
      }
      break;
  }
}

// Initialize monitoring
export function initWebVitals() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  onINP(sendToAnalytics);
}
`;

  fs.mkdirSync('apps/web/lib/performance', { recursive: true });
  fs.writeFileSync('apps/web/lib/performance/web-vitals.ts', webVitalsCode);

  console.log('✅ Generated Web Vitals monitoring\n');
}

// Main function
function main() {
  console.log('🚀 Starting performance optimization analysis...\n');
  console.log('=' .repeat(60) + '\n');

  // Run analyses
  analyzeBundleSize();
  findLazyLoadOpportunities();
  checkImageOptimization();

  // Generate optimized components
  generateOptimizedComponents();
  generateWebVitalsMonitoring();

  // Generate recommendations
  generateRecommendations();

  // Print report
  console.log('=' .repeat(60));
  console.log('📊 PERFORMANCE OPTIMIZATION REPORT');
  console.log('=' .repeat(60) + '\n');

  if (report.largeModules.length > 0) {
    console.log('⚠️  Large Bundle Pages:');
    report.largeModules.slice(0, 5).forEach(module => {
      console.log(`  - ${module.page}: ${(module.size / 1024).toFixed(2)}KB`);
    });
    console.log();
  }

  if (report.lazyLoadOpportunities.length > 0) {
    console.log('💡 Lazy Load Opportunities:');
    const components = report.lazyLoadOpportunities.filter(o => o.type === 'component');
    const libraries = report.lazyLoadOpportunities.filter(o => o.type === 'library');

    if (components.length > 0) {
      console.log(`  Components: ${components.length} large components can be lazy loaded`);
    }
    if (libraries.length > 0) {
      console.log(`  Libraries: ${[...new Set(libraries.map(l => l.library))].join(', ')}`);
    }
    console.log();
  }

  if (report.imageOptimizations.length > 0) {
    console.log('🖼️  Images Needing Optimization:');
    report.imageOptimizations.slice(0, 5).forEach(img => {
      console.log(`  - ${img.file}: ${img.size} (${img.recommendation})`);
    });
    console.log();
  }

  console.log('📋 Recommendations:');
  report.recommendations.forEach(rec => {
    console.log(`\n  ${rec.category} (Priority: ${rec.priority}):`);
    rec.items.forEach(item => {
      console.log(`    • ${item}`);
    });
  });

  console.log('\n' + '=' .repeat(60));
  console.log('✨ Performance optimization analysis complete!');
  console.log('\nNext steps:');
  console.log('1. Run: npm run build to see bundle analysis');
  console.log('2. Implement lazy loading for identified components');
  console.log('3. Optimize images using next/image');
  console.log('4. Add Web Vitals monitoring to _app.tsx');
}

// Run the script
main();