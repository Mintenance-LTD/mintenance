/**
 * SEO Manager Module
 * Handles search engine optimization, meta tags, structured data,
 * and social media previews
 */

import { Platform } from 'react-native';
import { logger } from '../logger';
import { SEOConfig } from './types';

export class SEOManager {
  constructor(private config: SEOConfig) {}

  /**
   * Initialize SEO features
   */
  initialize(): void {
    if (Platform.OS !== 'web') return;

    try {
      logger.info('SEOManager', 'Initializing SEO features');

      // Setup meta tags
      this.setupMetaTags();

      // Setup Open Graph tags
      this.setupOpenGraphTags();

      // Setup Twitter Card tags
      this.setupTwitterCardTags();

      // Setup structured data
      if (this.config.enableStructuredData) {
        this.setupStructuredData();
      }

      logger.info('SEOManager', 'SEO initialized successfully');
    } catch (error) {
      logger.error('SEOManager', 'Failed to initialize SEO', error);
    }
  }

  /**
   * Setup basic meta tags
   */
  private setupMetaTags(): void {
    this.updateMetaTag('description', this.config.defaultDescription);
    this.updateMetaTag('keywords', this.config.defaultKeywords.join(', '));
    this.updateMetaTag('author', this.config.siteName);

    // Viewport
    this.updateMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=5.0');

    // robots
    this.updateMetaTag('robots', 'index, follow');

    logger.info('SEOManager', 'Basic meta tags configured');
  }

  /**
   * Setup Open Graph tags for social sharing
   */
  private setupOpenGraphTags(): void {
    this.updateMetaTag('og:type', 'website', 'property');
    this.updateMetaTag('og:site_name', this.config.siteName, 'property');
    this.updateMetaTag('og:title', this.config.defaultTitle, 'property');
    this.updateMetaTag('og:description', this.config.defaultDescription, 'property');

    if (this.config.facebookAppId) {
      this.updateMetaTag('fb:app_id', this.config.facebookAppId, 'property');
    }

    logger.info('SEOManager', 'Open Graph tags configured');
  }

  /**
   * Setup Twitter Card tags
   */
  private setupTwitterCardTags(): void {
    this.updateMetaTag('twitter:card', 'summary_large_image');
    this.updateMetaTag('twitter:title', this.config.defaultTitle);
    this.updateMetaTag('twitter:description', this.config.defaultDescription);

    if (this.config.twitterHandle) {
      this.updateMetaTag('twitter:site', this.config.twitterHandle);
      this.updateMetaTag('twitter:creator', this.config.twitterHandle);
    }

    logger.info('SEOManager', 'Twitter Card tags configured');
  }

  /**
   * Setup structured data (JSON-LD)
   */
  private setupStructuredData(): void {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: this.config.siteName,
      description: this.config.defaultDescription,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, iOS, Android',
    };

    this.injectStructuredData(structuredData);

    logger.info('SEOManager', 'Structured data configured');
  }

  /**
   * Inject structured data into page
   */
  private injectStructuredData(data: object): void {
    let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
  }

  /**
   * Update page title
   */
  updateTitle(title: string): void {
    if (Platform.OS !== 'web') return;

    document.title = title;
    this.updateMetaTag('og:title', title, 'property');
    this.updateMetaTag('twitter:title', title);

    logger.info('SEOManager', 'Page title updated', { title });
  }

  /**
   * Update page description
   */
  updateDescription(description: string): void {
    if (Platform.OS !== 'web') return;

    this.updateMetaTag('description', description);
    this.updateMetaTag('og:description', description, 'property');
    this.updateMetaTag('twitter:description', description);

    logger.info('SEOManager', 'Page description updated');
  }

  /**
   * Update page keywords
   */
  updateKeywords(keywords: string[]): void {
    if (Platform.OS !== 'web') return;

    this.updateMetaTag('keywords', keywords.join(', '));

    logger.info('SEOManager', 'Page keywords updated', { count: keywords.length });
  }

  /**
   * Set canonical URL
   */
  setCanonicalUrl(url: string): void {
    if (Platform.OS !== 'web') return;

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }

    link.href = url;
    this.updateMetaTag('og:url', url, 'property');

    logger.info('SEOManager', 'Canonical URL set', { url });
  }

  /**
   * Set page image for social sharing
   */
  setImage(imageUrl: string): void {
    if (Platform.OS !== 'web') return;

    this.updateMetaTag('og:image', imageUrl, 'property');
    this.updateMetaTag('twitter:image', imageUrl);

    logger.info('SEOManager', 'Social image set', { imageUrl });
  }

  /**
   * Update meta tag
   */
  private updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name'): void {
    let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;

    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attribute, name);
      document.head.appendChild(meta);
    }

    meta.setAttribute('content', content);
  }

  /**
   * Generate sitemap (basic implementation)
   */
  generateSitemap(routes: Array<{ path: string; priority: number; changefreq: string }>): string {
    const urls = routes.map(route => `
  <url>
    <loc>${route.path}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`;
  }

  /**
   * Update page metadata for specific content
   */
  updatePageMetadata(metadata: {
    title?: string;
    description?: string;
    keywords?: string[];
    image?: string;
    url?: string;
    type?: string;
  }): void {
    if (Platform.OS !== 'web') return;

    if (metadata.title) {
      this.updateTitle(metadata.title);
    }

    if (metadata.description) {
      this.updateDescription(metadata.description);
    }

    if (metadata.keywords) {
      this.updateKeywords(metadata.keywords);
    }

    if (metadata.image) {
      this.setImage(metadata.image);
    }

    if (metadata.url) {
      this.setCanonicalUrl(metadata.url);
    }

    if (metadata.type) {
      this.updateMetaTag('og:type', metadata.type, 'property');
    }

    logger.info('SEOManager', 'Page metadata updated', { metadata });
  }
}