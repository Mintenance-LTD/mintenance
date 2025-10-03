/**
 * Image Optimizer Module
 * Handles image lazy loading, WebP support detection,
 * and critical resource hints
 */

import { Platform } from 'react-native';
import { logger } from '../logger';
import { ImageOptimizationConfig } from './types';

export class ImageOptimizer {
  private imageObserver?: IntersectionObserver;
  private supportsWebP = false;

  constructor(private config: ImageOptimizationConfig) {}

  /**
   * Initialize image optimizations
   */
  initialize(): void {
    if (Platform.OS !== 'web') return;

    try {
      logger.info('ImageOptimizer', 'Initializing image optimizations');

      // Check WebP support
      if (this.config.enableWebP) {
        this.checkWebPSupport();
      }

      // Setup lazy loading
      if (this.config.enableLazyLoading) {
        this.setupLazyLoading();
      }

      // Add critical resource hints
      if (this.config.enableCriticalResourceHints) {
        this.addCriticalResourceHints();
      }

      logger.info('ImageOptimizer', 'Image optimizations initialized successfully');
    } catch (error) {
      logger.error('ImageOptimizer', 'Failed to initialize image optimizations', error);
    }
  }

  /**
   * Check WebP support and add class to document
   */
  private checkWebPSupport(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    this.supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;

    // Add class to document for CSS targeting
    document.documentElement.classList.add(this.supportsWebP ? 'webp' : 'no-webp');

    logger.info('ImageOptimizer', 'WebP support detected', { supported: this.supportsWebP });
  }

  /**
   * Setup lazy loading with Intersection Observer
   */
  private setupLazyLoading(): void {
    if (!('IntersectionObserver' in window)) {
      logger.warn('ImageOptimizer', 'IntersectionObserver not supported, falling back to immediate loading');
      this.fallbackLazyLoading();
      return;
    }

    this.imageObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    // Observe all images with lazy class
    this.observeLazyImages();

    // Watch for dynamically added images
    this.watchForNewImages();

    logger.info('ImageOptimizer', 'Lazy loading configured');
  }

  /**
   * Observe all lazy images
   */
  private observeLazyImages(): void {
    const lazyImages = document.querySelectorAll('img.lazy, img[data-src]');

    lazyImages.forEach((img) => {
      this.imageObserver?.observe(img);
    });

    logger.debug('ImageOptimizer', 'Observing lazy images', { count: lazyImages.length });
  }

  /**
   * Watch for dynamically added images
   */
  private watchForNewImages(): void {
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const element = node as Element;

            // Check if added node is a lazy image
            if (
              element.tagName === 'IMG' &&
              (element.classList.contains('lazy') || element.hasAttribute('data-src'))
            ) {
              this.imageObserver?.observe(element);
            }

            // Check for lazy images within added node
            const lazyImages = element.querySelectorAll('img.lazy, img[data-src]');
            lazyImages.forEach((img) => {
              this.imageObserver?.observe(img);
            });
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    logger.debug('ImageOptimizer', 'Watching for new lazy images');
  }

  /**
   * Load an image
   */
  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (!src && !srcset) return;

    // Set loading attribute
    img.setAttribute('loading', 'lazy');

    // Load image
    if (srcset) {
      img.srcset = srcset;
    }

    if (src) {
      img.src = src;
    }

    // Remove lazy class and data attributes
    img.classList.remove('lazy');
    delete img.dataset.src;
    delete img.dataset.srcset;

    // Add loaded class for CSS animations
    img.addEventListener('load', () => {
      img.classList.add('loaded');
    });

    logger.debug('ImageOptimizer', 'Image loaded', { src });
  }

  /**
   * Fallback lazy loading for browsers without IntersectionObserver
   */
  private fallbackLazyLoading(): void {
    const lazyImages = document.querySelectorAll('img.lazy, img[data-src]');

    lazyImages.forEach((img) => {
      this.loadImage(img as HTMLImageElement);
    });

    logger.info('ImageOptimizer', 'Fallback loading applied', { count: lazyImages.length });
  }

  /**
   * Add critical resource hints for faster loading
   */
  private addCriticalResourceHints(): void {
    const criticalResources = [
      { href: '/assets/icon.png', as: 'image', type: 'image/png' },
      { href: '/assets/splash.png', as: 'image', type: 'image/png' },
      { href: '/assets/fonts/main.woff2', as: 'font', type: 'font/woff2', crossOrigin: true },
    ];

    criticalResources.forEach((resource) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;

      if (resource.type) {
        link.type = resource.type;
      }

      if (resource.crossOrigin) {
        link.crossOrigin = 'anonymous';
      }

      document.head.appendChild(link);
    });

    logger.info('ImageOptimizer', 'Critical resource hints added', {
      count: criticalResources.length,
    });
  }

  /**
   * Preload specific image
   */
  preloadImage(src: string, type: string = 'image/png'): void {
    if (Platform.OS !== 'web') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = src;
    link.as = 'image';
    link.type = type;
    document.head.appendChild(link);

    logger.debug('ImageOptimizer', 'Image preloaded', { src });
  }

  /**
   * Get WebP support status
   */
  isWebPSupported(): boolean {
    return this.supportsWebP;
  }

  /**
   * Convert image URL to WebP if supported
   */
  getOptimizedImageUrl(url: string): string {
    if (!this.supportsWebP) return url;

    // If URL already has WebP extension, return as is
    if (url.endsWith('.webp')) return url;

    // Replace common image extensions with webp
    return url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  }

  /**
   * Dispose image optimizer
   */
  dispose(): void {
    if (this.imageObserver) {
      this.imageObserver.disconnect();
      this.imageObserver = undefined;
    }

    logger.info('ImageOptimizer', 'Image optimizer disposed');
  }
}
