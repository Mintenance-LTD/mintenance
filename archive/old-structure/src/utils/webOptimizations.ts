import { Platform } from 'react-native';
import { logger } from './logger';
import { performanceMonitor } from './performanceMonitor';

export interface PWAConfig {
  appName: string;
  appDescription: string;
  themeColor: string;
  backgroundColor: string;
  iconSizes: number[];
  manifestPath?: string;
}

export interface ImageOptimizationConfig {
  enableWebP: boolean;
  enableLazyLoading: boolean;
  enableProgressiveJPEG: boolean;
  compressionQuality: number;
  enableCriticalResourceHints: boolean;
}

export interface SEOConfig {
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords: string[];
  twitterHandle?: string;
  facebookAppId?: string;
  enableStructuredData: boolean;
}

export interface AnalyticsConfig {
  googleAnalyticsId?: string;
  enableUserTiming: boolean;
  enableScrollDepthTracking: boolean;
  enableCustomEvents: boolean;
  enableConversionTracking: boolean;
}

// Enhanced Web performance optimizations with PWA and analytics
export class WebOptimizations {
  private static instance: WebOptimizations;
  private isInitialized = false;
  private serviceWorkerRegistration?: ServiceWorkerRegistration;
  private analyticsInitialized = false;

  static getInstance(): WebOptimizations {
    if (!this.instance) {
      this.instance = new WebOptimizations();
    }
    return this.instance;
  }
  // Preload critical resources
  static preloadResources() {
    if (Platform.OS !== 'web') return;

    // Preload critical images
    const criticalImages = [
      '/assets/icon.png',
      '/assets/adaptive-icon.png',
      '/assets/splash.png',
    ];

    criticalImages.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  }

  // Set up viewport meta tag for mobile optimization
  static setupViewport() {
    if (Platform.OS !== 'web') return;

    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }

    viewportMeta.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes'
    );
  }

  // Add theme color for mobile browsers
  static setupThemeColor() {
    if (Platform.OS !== 'web') return;

    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }

    themeColorMeta.setAttribute('content', '#10B981'); // Your app's primary color
  }

  // Set up PWA meta tags
  static setupPWAMeta() {
    if (Platform.OS !== 'web') return;

    // App title
    document.title = 'Mintenance - Home Services Marketplace';

    // Description meta tag
    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta');
      descriptionMeta.setAttribute('name', 'description');
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.setAttribute(
      'content',
      'Connect with trusted contractors for home maintenance, repairs, and improvements. Find verified professionals in your area.'
    );

    // Apple mobile web app meta tags
    const appleMetas = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'Mintenance' },
    ];

    appleMetas.forEach(meta => {
      let metaTag = document.querySelector(`meta[name="${meta.name}"]`);
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', meta.name);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', meta.content);
    });

    // Microsoft tile meta tags
    const msTileMetas = [
      { name: 'msapplication-TileColor', content: '#10B981' },
      { name: 'msapplication-TileImage', content: '/assets/icon.png' },
    ];

    msTileMetas.forEach(meta => {
      let metaTag = document.querySelector(`meta[name="${meta.name}"]`);
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', meta.name);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', meta.content);
    });
  }

  // Add structured data for SEO
  static addStructuredData() {
    if (Platform.OS !== 'web') return;

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Mintenance',
      description: 'Home Services Marketplace connecting homeowners with contractors',
      url: window.location.origin,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, iOS, Android',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      author: {
        '@type': 'Organization',
        name: 'Mintenance',
      },
    };

    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(structuredData);
  }

  // Set up Open Graph meta tags for social sharing
  static setupOpenGraph() {
    if (Platform.OS !== 'web') return;

    const ogTags = [
      { property: 'og:title', content: 'Mintenance - Home Services Marketplace' },
      { property: 'og:description', content: 'Connect with trusted contractors for home maintenance, repairs, and improvements.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: window.location.origin },
      { property: 'og:image', content: `${window.location.origin}/assets/icon.png` },
      { property: 'og:site_name', content: 'Mintenance' },
    ];

    ogTags.forEach(tag => {
      let metaTag = document.querySelector(`meta[property="${tag.property}"]`);
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('property', tag.property);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', tag.content);
    });

    // Twitter Card meta tags
    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Mintenance - Home Services Marketplace' },
      { name: 'twitter:description', content: 'Connect with trusted contractors for home maintenance, repairs, and improvements.' },
      { name: 'twitter:image', content: `${window.location.origin}/assets/icon.png` },
    ];

    twitterTags.forEach(tag => {
      let metaTag = document.querySelector(`meta[name="${tag.name}"]`);
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', tag.name);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', tag.content);
    });
  }

  // Initialize all web optimizations
  static initialize() {
    if (Platform.OS !== 'web') return;

    this.setupViewport();
    this.setupThemeColor();
    this.setupPWAMeta();
    this.setupOpenGraph();
    this.addStructuredData();
    this.preloadResources();
  }

  // Performance monitoring
  static setupPerformanceMonitoring() {
    if (Platform.OS !== 'web') return;

    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            console.log('FCP:', entry.startTime);
          }
        }
      });

      try {
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (e) {
        // Fallback for browsers that don't support paint timing
      }

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // Fallback for browsers that don't support LCP
      }

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            console.log('CLS:', entry.value);
          }
        }
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // Fallback for browsers that don't support layout shift
      }
    }

    // Monitor resource loading
    window.addEventListener('load', () => {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      console.log('Page load time:', loadTime, 'ms');
    });
  }

  // Accessibility enhancements for web
  static setupAccessibility() {
    if (Platform.OS !== 'web') return;

    // Skip to main content link
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.style.cssText = `
      position: absolute;
      left: -10000px;
      top: auto;
      width: 1px;
      height: 1px;
      overflow: hidden;
      z-index: 10000;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.cssText = `
        position: absolute;
        left: 6px;
        top: 7px;
        background: #000;
        color: #fff;
        padding: 8px 16px;
        text-decoration: none;
        z-index: 10000;
        border-radius: 4px;
      `;
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.cssText = `
        position: absolute;
        left: -10000px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
        z-index: 10000;
      `;
    });

    document.body.insertBefore(skipLink, document.body.firstChild);

    // High contrast mode detection
    if (window.matchMedia) {
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
      if (highContrastQuery.matches) {
        document.body.classList.add('high-contrast');
      }

      highContrastQuery.addEventListener('change', (e) => {
        if (e.matches) {
          document.body.classList.add('high-contrast');
        } else {
          document.body.classList.remove('high-contrast');
        }
      });

      // Reduced motion preference
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (reducedMotionQuery.matches) {
        document.body.classList.add('reduced-motion');
      }

      reducedMotionQuery.addEventListener('change', (e) => {
        if (e.matches) {
          document.body.classList.add('reduced-motion');
        } else {
          document.body.classList.remove('reduced-motion');
        }
      });
    }
  }

  // Keyboard navigation improvements
  static setupKeyboardNavigation() {
    if (Platform.OS !== 'web') return;

    // Focus management
    document.addEventListener('keydown', (e) => {
      // Escape key to close modals
      if (e.key === 'Escape') {
        const modal = document.querySelector('[data-modal="true"]:last-of-type');
        if (modal) {
          const closeButton = modal.querySelector('[data-close-modal="true"]');
          if (closeButton) {
            (closeButton as HTMLElement).click();
          }
        }
      }
    });

    // Show focus outline only when navigating with keyboard
    let isUsingMouse = false;

    document.addEventListener('mousedown', () => {
      isUsingMouse = true;
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        isUsingMouse = false;
      }
    });

    document.addEventListener('focusin', () => {
      if (isUsingMouse) {
        document.body.classList.add('mouse-navigation');
      } else {
        document.body.classList.remove('mouse-navigation');
      }
    });
  }

  /**
   * Enhanced initialization with PWA and analytics support
   */
  async initializeEnhanced(
    pwaConfig: PWAConfig,
    imageConfig: ImageOptimizationConfig,
    seoConfig: SEOConfig,
    analyticsConfig: AnalyticsConfig
  ): Promise<void> {
    if (Platform.OS !== 'web' || this.isInitialized) return;

    try {
      logger.info('WebOptimizations', 'Initializing enhanced web optimizations');

      // Initialize existing optimizations
      this.initialize();
      this.setupAccessibility();
      this.setupKeyboardNavigation();
      this.setupPerformanceMonitoring();

      // Initialize new PWA and analytics features
      await Promise.all([
        this.setupEnhancedPWA(pwaConfig),
        this.initializeServiceWorker(),
        this.setupImageOptimizations(imageConfig),
        this.setupEnhancedSEO(seoConfig),
        this.initializeAnalytics(analyticsConfig),
        this.setupCoreWebVitals(),
        this.setupUserEngagement()
      ]);

      this.isInitialized = true;
      logger.info('WebOptimizations', 'Enhanced web optimizations initialized successfully');
    } catch (error) {
      logger.error('WebOptimizations', 'Failed to initialize enhanced web optimizations', error as Error);
      throw error;
    }
  }

  /**
   * Setup enhanced PWA features with install prompts
   */
  private async setupEnhancedPWA(config: PWAConfig): Promise<void> {
    const manifest = {
      name: config.appName,
      short_name: config.appName,
      description: config.appDescription,
      start_url: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      theme_color: config.themeColor,
      background_color: config.backgroundColor,
      scope: '/',
      icons: config.iconSizes.map(size => ({
        src: `/assets/icons/icon-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: size >= 512 ? 'any maskable' : 'any'
      })),
      categories: ['business', 'productivity', 'utilities'],
      lang: 'en-US',
      dir: 'ltr',
      prefer_related_applications: false
    };

    // Inject dynamic manifest
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(manifestBlob);

    const linkElement = document.createElement('link');
    linkElement.rel = 'manifest';
    linkElement.href = manifestURL;
    document.head.appendChild(linkElement);

    // Setup install prompt handling
    this.setupInstallPrompt();

    logger.debug('WebOptimizations', 'Enhanced PWA features configured');
  }

  /**
   * Setup PWA install prompt handling
   */
  private setupInstallPrompt(): void {
    let deferredPrompt: any;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      this.showInstallBanner(deferredPrompt);
      logger.debug('WebOptimizations', 'PWA install prompt available');
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      this.hideInstallBanner();
      this.trackEvent('pwa_installed', { timestamp: Date.now() });
      logger.info('WebOptimizations', 'PWA installed successfully');
    });
  }

  /**
   * Initialize Service Worker for enhanced caching
   */
  private async initializeServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      logger.warn('WebOptimizations', 'Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      this.serviceWorkerRegistration = registration;

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateAvailableBanner();
            }
          });
        }
      });

      logger.info('WebOptimizations', 'Service Worker registered successfully');
    } catch (error) {
      logger.error('WebOptimizations', 'Service Worker registration failed', error as Error);
    }
  }

  /**
   * Setup image optimizations with lazy loading and WebP
   */
  private setupImageOptimizations(config: ImageOptimizationConfig): void {
    if (config.enableLazyLoading) {
      this.enableLazyLoading();
    }

    if (config.enableWebP) {
      this.enableWebPSupport();
    }

    if (config.enableCriticalResourceHints) {
      this.addCriticalResourceHints();
    }

    logger.debug('WebOptimizations', 'Image optimizations configured');
  }

  /**
   * Enable lazy loading for images with intersection observer
   */
  private enableLazyLoading(): void {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.classList.remove('lazy');
              observer.unobserve(img);
            }
          }
        });
      });

      // Observe all images with lazy class
      document.querySelectorAll('img.lazy').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  /**
   * Enable WebP support detection
   */
  private enableWebPSupport(): void {
    const supportsWebP = this.checkWebPSupport();
    document.documentElement.classList.add(supportsWebP ? 'webp' : 'no-webp');
  }

  /**
   * Check WebP support
   */
  private checkWebPSupport(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Add critical resource hints for faster loading
   */
  private addCriticalResourceHints(): void {
    const criticalResources = [
      { href: '/assets/fonts/main.woff2', as: 'font', type: 'font/woff2' },
      { href: '/assets/css/critical.css', as: 'style' }
    ];

    criticalResources.forEach(resource => {
      const linkElement = document.createElement('link');
      linkElement.rel = 'preload';
      linkElement.href = resource.href;
      linkElement.as = resource.as;
      if (resource.type) linkElement.type = resource.type;
      if (resource.as === 'font') linkElement.crossOrigin = 'anonymous';
      document.head.appendChild(linkElement);
    });
  }

  /**
   * Setup enhanced SEO with additional meta tags
   */
  private setupEnhancedSEO(config: SEOConfig): void {
    // Run existing SEO setup
    this.setupOpenGraph();
    this.addStructuredData();

    // Add additional meta tags
    this.updateMetaTag('keywords', config.defaultKeywords.join(', '));
    this.updateMetaTag('author', 'Mintenance Team');
    this.updateMetaTag('robots', 'index, follow');

    // Enhanced Open Graph and Twitter tags
    if (config.twitterHandle) {
      this.updateMetaName('twitter:site', config.twitterHandle);
    }

    if (config.facebookAppId) {
      this.updateMetaProperty('fb:app_id', config.facebookAppId);
    }

    logger.debug('WebOptimizations', 'Enhanced SEO configured');
  }

  /**
   * Initialize analytics with Google Analytics 4
   */
  private async initializeAnalytics(config: AnalyticsConfig): Promise<void> {
    if (config.googleAnalyticsId) {
      await this.setupGoogleAnalytics(config.googleAnalyticsId);
    }

    if (config.enableUserTiming) {
      this.setupUserTiming();
    }

    if (config.enableScrollDepthTracking) {
      this.setupScrollDepthTracking();
    }

    this.analyticsInitialized = true;
    logger.debug('WebOptimizations', 'Analytics initialized');
  }

  /**
   * Setup Google Analytics 4
   */
  private async setupGoogleAnalytics(analyticsId: string): Promise<void> {
    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsId}`;
      document.head.appendChild(script);

      (window as any).dataLayer = (window as any).dataLayer || [];
      const gtag = (...args: any[]) => {
        (window as any).dataLayer.push(args);
      };
      (window as any).gtag = gtag;

      gtag('js', new Date());
      gtag('config', analyticsId, {
        send_page_view: true,
        allow_google_signals: true,
        allow_ad_personalization_signals: false
      });

      logger.debug('WebOptimizations', 'Google Analytics initialized');
    } catch (error) {
      logger.error('WebOptimizations', 'Failed to initialize Google Analytics', error as Error);
    }
  }

  /**
   * Setup Core Web Vitals monitoring
   */
  private setupCoreWebVitals(): void {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      this.observePerformance('largest-contentful-paint', (entries) => {
        const lcpEntry = entries[entries.length - 1];
        const lcpValue = lcpEntry.renderTime || lcpEntry.loadTime;
        this.trackWebVital('LCP', lcpValue);
      });

      // First Input Delay (FID)
      this.observePerformance('first-input', (entries) => {
        const fidEntry = entries[0];
        const fidValue = fidEntry.processingStart - fidEntry.startTime;
        this.trackWebVital('FID', fidValue);
      });

      // Cumulative Layout Shift (CLS)
      this.observePerformance('layout-shift', (entries) => {
        let clsValue = 0;
        entries.forEach(entry => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });
        this.trackWebVital('CLS', clsValue);
      });
    }
  }

  /**
   * Generic performance observer helper
   */
  private observePerformance(type: string, callback: (entries: PerformanceEntry[]) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ type, buffered: true });
    } catch (error) {
      logger.warn('WebOptimizations', `Could not observe ${type} performance`, error as Error);
    }
  }

  /**
   * Track Core Web Vitals
   */
  private trackWebVital(metric: string, value: number): void {
    const roundedValue = Math.round(value);
    this.trackTiming('Web Vitals', metric, roundedValue);
    performanceMonitor.recordMetric(`web_vital_${metric.toLowerCase()}`, roundedValue);
    logger.debug('WebOptimizations', `Core Web Vital: ${metric}`, { value: roundedValue });
  }

  /**
   * Setup user timing measurements
   */
  private setupUserTiming(): void {
    performance.mark('app-start');

    window.addEventListener('load', () => {
      performance.mark('app-loaded');
      performance.measure('app-load-time', 'app-start', 'app-loaded');

      const loadMeasure = performance.getEntriesByName('app-load-time')[0];
      this.trackTiming('App Performance', 'Load Time', Math.round(loadMeasure.duration));
    });
  }

  /**
   * Setup scroll depth tracking
   */
  private setupScrollDepthTracking(): void {
    const scrollThresholds = [25, 50, 75, 90, 100];
    const triggeredThresholds = new Set<number>();

    const trackScrollDepth = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      scrollThresholds.forEach(threshold => {
        if (scrollPercent >= threshold && !triggeredThresholds.has(threshold)) {
          triggeredThresholds.add(threshold);
          this.trackEvent('scroll_depth', { percent: threshold });
        }
      });
    };

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          trackScrollDepth();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  /**
   * Setup user engagement tracking
   */
  private setupUserEngagement(): void {
    let startTime = Date.now();
    let isVisible = true;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (isVisible) {
          const sessionDuration = Date.now() - startTime;
          this.trackTiming('Engagement', 'Session Duration', Math.round(sessionDuration / 1000));
          isVisible = false;
        }
      } else {
        startTime = Date.now();
        isVisible = true;
      }
    });

    ['click', 'keydown', 'touchstart'].forEach(event => {
      document.addEventListener(event, this.throttle(() => {
        this.trackEvent('user_interaction', { type: event });
      }, 1000));
    });
  }

  /**
   * Helper methods for analytics and UI
   */
  private updateMetaTag(name: string, content: string): void {
    let metaElement = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
    if (!metaElement) {
      metaElement = document.createElement('meta');
      metaElement.name = name;
      document.head.appendChild(metaElement);
    }
    metaElement.content = content;
  }

  private updateMetaProperty(property: string, content: string): void {
    let metaElement = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
    if (!metaElement) {
      metaElement = document.createElement('meta');
      metaElement.setAttribute('property', property);
      document.head.appendChild(metaElement);
    }
    metaElement.content = content;
  }

  private updateMetaName(name: string, content: string): void {
    let metaElement = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
    if (!metaElement) {
      metaElement = document.createElement('meta');
      metaElement.name = name;
      document.head.appendChild(metaElement);
    }
    metaElement.content = content;
  }

  private showInstallBanner(deferredPrompt: any): void {
    const installBanner = document.createElement('div');
    installBanner.id = 'install-banner';
    installBanner.innerHTML = `
      <div style="background: #2563eb; color: white; padding: 16px; text-align: center; position: fixed; top: 0; width: 100%; z-index: 1000;">
        <span>Install Mintenance for better experience</span>
        <button id="install-button" style="margin-left: 16px; padding: 8px 16px; background: white; color: #2563eb; border: none; border-radius: 4px; cursor: pointer;">Install</button>
        <button id="dismiss-button" style="margin-left: 8px; padding: 8px 16px; background: transparent; color: white; border: 1px solid white; border-radius: 4px; cursor: pointer;">Not now</button>
      </div>
    `;

    document.body.appendChild(installBanner);

    document.getElementById('install-button')?.addEventListener('click', async () => {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      this.trackEvent('pwa_install_prompt', { outcome });
      this.hideInstallBanner();
    });

    document.getElementById('dismiss-button')?.addEventListener('click', () => {
      this.trackEvent('pwa_install_dismissed', {});
      this.hideInstallBanner();
    });
  }

  private hideInstallBanner(): void {
    const banner = document.getElementById('install-banner');
    if (banner) {
      banner.remove();
    }
  }

  private showUpdateAvailableBanner(): void {
    const updateBanner = document.createElement('div');
    updateBanner.innerHTML = `
      <div style="background: #059669; color: white; padding: 16px; text-align: center; position: fixed; bottom: 0; width: 100%; z-index: 1000;">
        <span>A new version is available</span>
        <button id="refresh-button" style="margin-left: 16px; padding: 8px 16px; background: white; color: #059669; border: none; border-radius: 4px; cursor: pointer;">Refresh</button>
      </div>
    `;

    document.body.appendChild(updateBanner);

    document.getElementById('refresh-button')?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  private trackEvent(eventName: string, properties: Record<string, any> = {}): void {
    if (!this.analyticsInitialized) return;

    if ((window as any).gtag) {
      (window as any).gtag('event', eventName, properties);
    }

    logger.debug('WebOptimizations', 'Analytics event', { event: eventName, properties });
  }

  private trackTiming(category: string, variable: string, value: number): void {
    if (!this.analyticsInitialized) return;

    if ((window as any).gtag) {
      (window as any).gtag('event', 'timing_complete', {
        custom_parameter_1: category,
        custom_parameter_2: variable,
        value: value
      });
    }

    performanceMonitor.recordMetric(`timing_${category}_${variable}`.toLowerCase().replace(/\s+/g, '_'), value);
  }

  private throttle(func: Function, delay: number): Function {
    let timeoutId: NodeJS.Timeout;
    let lastExecTime = 0;

    return function (...args: any[]) {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  /**
   * Get performance report with Web Vitals and analytics data
   */
  getPerformanceReport(): Record<string, any> {
    const report: Record<string, any> = {
      timestamp: new Date().toISOString(),
      isInitialized: this.isInitialized,
      serviceWorkerActive: !!this.serviceWorkerRegistration?.active,
      analyticsActive: this.analyticsInitialized
    };

    if ('performance' in window) {
      report.navigation = performance.getEntriesByType('navigation')[0];
      report.memory = (performance as any).memory;
    }

    const webVitals = performance.getEntriesByType('largest-contentful-paint');
    if (webVitals.length > 0) {
      report.largestContentfulPaint = webVitals[webVitals.length - 1];
    }

    return report;
  }

  /**
   * Clean up resources and observers
   */
  dispose(): void {
    if (this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.unregister();
    }

    this.isInitialized = false;
    logger.info('WebOptimizations', 'Enhanced web optimizations disposed');
  }
}

// Export enhanced instance
export const webOptimizer = WebOptimizations.getInstance();

// Default configurations
export const defaultConfigs = {
  pwa: {
    appName: 'Mintenance',
    appDescription: 'Professional contractor discovery and home maintenance platform',
    themeColor: '#2563eb',
    backgroundColor: '#ffffff',
    iconSizes: [72, 96, 128, 144, 152, 192, 384, 512]
  } as PWAConfig,

  imageOptimization: {
    enableWebP: true,
    enableLazyLoading: true,
    enableProgressiveJPEG: true,
    compressionQuality: 85,
    enableCriticalResourceHints: true
  } as ImageOptimizationConfig,

  seo: {
    siteName: 'Mintenance',
    defaultTitle: 'Mintenance - Professional Contractor Discovery',
    defaultDescription: 'Connect with verified contractors for home maintenance, repairs, and improvement projects. Professional, reliable, and affordable.',
    defaultKeywords: ['contractor', 'home maintenance', 'repairs', 'improvement', 'professional'],
    enableStructuredData: true
  } as SEOConfig,

  analytics: {
    enableUserTiming: true,
    enableScrollDepthTracking: true,
    enableCustomEvents: true,
    enableConversionTracking: true
  } as AnalyticsConfig
};

// Auto-initialize optimizations - DISABLED FOR DEBUGGING
// if (Platform.OS === 'web') {
//   // Run immediately
//   WebOptimizations.initialize();
//   WebOptimizations.setupAccessibility();
//   WebOptimizations.setupKeyboardNavigation();

//   // Run after page load
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', () => {
//       WebOptimizations.setupPerformanceMonitoring();
//     });
//   } else {
//     WebOptimizations.setupPerformanceMonitoring();
//   }
// }