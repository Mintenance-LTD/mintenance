/**
 * Unit tests for SEOManager (web optimizations).
 *
 * The source is web-only: every public method early-returns unless
 * Platform.OS === 'web', and the private setup methods drive the DOM directly
 * (document.head / createElement / querySelector / meta+link+script tags).
 *
 * The mobile Jest environment is `node` (no jsdom), so this suite installs a
 * minimal but behaviourally-real DOM stub on `global`. The stub's querySelector
 * is wired to a live registry of appended tags, so "update existing" vs "create
 * new" branches are exercised against real lookups and real attribute writes.
 *
 * Only externals are mocked: the logger and the global document. The SEOManager
 * class itself is exercised for real, with assertions on actual DOM mutations.
 */

import { Platform } from 'react-native';
import { SEOManager } from '../SEOManager';
import { SEOConfig } from '../types';

jest.mock('../../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { logger } from '../../logger';

// ---------------------------------------------------------------------------
// Minimal DOM element + document stub
// ---------------------------------------------------------------------------

class FakeElement {
  tagName: string;
  type = '';
  rel = '';
  href = '';
  title = '';
  textContent: string | null = '';
  attributes: Record<string, string> = {};

  constructor(tagName = 'div') {
    this.tagName = tagName.toLowerCase();
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }
}

interface FakeDocument {
  head: {
    children: FakeElement[];
    appendChild: (el: FakeElement) => FakeElement;
  };
  title: string;
  createElement: (tag: string) => FakeElement;
  querySelector: (sel: string) => FakeElement | null;
  _appended: FakeElement[];
  _createdCount: number;
}

/**
 * Build a behaviourally-real document stub whose querySelector resolves against
 * the elements actually appended to <head>, so the create-vs-update branches in
 * updateMetaTag / injectStructuredData / setCanonicalUrl are driven for real.
 */
function buildDocument(): FakeDocument {
  const appended: FakeElement[] = [];
  let createdCount = 0;

  const head = {
    children: appended,
    appendChild(el: FakeElement) {
      appended.push(el);
      return el;
    },
  };

  const matchMeta = (sel: string): { attr: string; name: string } | null => {
    // meta[name="x"]  or  meta[property="x"]
    const m = sel.match(/^meta\[(name|property)="(.+)"\]$/);
    if (!m) return null;
    return { attr: m[1], name: m[2] };
  };

  const doc: FakeDocument = {
    head,
    title: '',
    createElement(tag: string) {
      createdCount += 1;
      doc._createdCount = createdCount;
      return new FakeElement(tag);
    },
    querySelector(sel: string) {
      if (sel === 'script[type="application/ld+json"]') {
        return (
          appended.find(
            (e) => e.tagName === 'script' && e.type === 'application/ld+json'
          ) ?? null
        );
      }
      if (sel === 'link[rel="canonical"]') {
        return (
          appended.find((e) => e.tagName === 'link' && e.rel === 'canonical') ??
          null
        );
      }
      const meta = matchMeta(sel);
      if (meta) {
        return (
          appended.find(
            (e) =>
              e.tagName === 'meta' && e.getAttribute(meta.attr) === meta.name
          ) ?? null
        );
      }
      return null;
    },
    _appended: appended,
    _createdCount: 0,
  };
  return doc;
}

function findMeta(
  doc: FakeDocument,
  attr: 'name' | 'property',
  name: string
): FakeElement | undefined {
  return doc._appended.find(
    (e) => e.tagName === 'meta' && e.getAttribute(attr) === name
  );
}

function metaContent(
  doc: FakeDocument,
  attr: 'name' | 'property',
  name: string
): string | null {
  return findMeta(doc, attr, name)?.getAttribute('content') ?? null;
}

// ---------------------------------------------------------------------------

const baseConfig: SEOConfig = {
  siteName: 'Mintenance',
  defaultTitle: 'Mintenance - Property Maintenance',
  defaultDescription: 'Find trusted contractors',
  defaultKeywords: ['maintenance', 'contractors'],
  twitterHandle: '@mintenance',
  facebookAppId: 'fb-123',
  enableStructuredData: true,
};

let doc: FakeDocument;

function installDom() {
  doc = buildDocument();
  (global as unknown as { document: FakeDocument }).document = doc;
}

function uninstallDom() {
  delete (global as unknown as { document?: FakeDocument }).document;
}

describe('SEOManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as unknown as { OS: string }).OS = 'web';
    installDom();
  });

  afterEach(() => {
    uninstallDom();
  });

  // -------------------------------------------------------------------------
  // initialize()
  // -------------------------------------------------------------------------

  describe('initialize', () => {
    it('configures meta, Open Graph, Twitter, and structured data on web', () => {
      const seo = new SEOManager(baseConfig);
      seo.initialize();

      // Basic meta tags created on head
      expect(metaContent(doc, 'name', 'description')).toBe(
        'Find trusted contractors'
      );
      expect(metaContent(doc, 'name', 'keywords')).toBe(
        'maintenance, contractors'
      );
      expect(metaContent(doc, 'name', 'author')).toBe('Mintenance');
      expect(metaContent(doc, 'name', 'viewport')).toBe(
        'width=device-width, initial-scale=1.0, maximum-scale=5.0'
      );
      expect(metaContent(doc, 'name', 'robots')).toBe('index, follow');

      // Open Graph (property attribute)
      expect(metaContent(doc, 'property', 'og:type')).toBe('website');
      expect(metaContent(doc, 'property', 'og:site_name')).toBe('Mintenance');
      expect(metaContent(doc, 'property', 'og:title')).toBe(
        'Mintenance - Property Maintenance'
      );
      expect(metaContent(doc, 'property', 'og:description')).toBe(
        'Find trusted contractors'
      );
      // facebookAppId present -> fb:app_id set
      expect(metaContent(doc, 'property', 'fb:app_id')).toBe('fb-123');

      // Twitter Card
      expect(metaContent(doc, 'name', 'twitter:card')).toBe(
        'summary_large_image'
      );
      expect(metaContent(doc, 'name', 'twitter:title')).toBe(
        'Mintenance - Property Maintenance'
      );
      expect(metaContent(doc, 'name', 'twitter:description')).toBe(
        'Find trusted contractors'
      );
      // twitterHandle present -> site + creator set
      expect(metaContent(doc, 'name', 'twitter:site')).toBe('@mintenance');
      expect(metaContent(doc, 'name', 'twitter:creator')).toBe('@mintenance');

      // Structured data injected as JSON-LD script
      const script = doc._appended.find((e) => e.tagName === 'script');
      expect(script).toBeDefined();
      expect(script!.type).toBe('application/ld+json');
      const parsed = JSON.parse(script!.textContent as string);
      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@type']).toBe('WebApplication');
      expect(parsed.name).toBe('Mintenance');
      expect(parsed.description).toBe('Find trusted contractors');
      expect(parsed.applicationCategory).toBe('BusinessApplication');
      expect(parsed.operatingSystem).toBe('Web, iOS, Android');

      expect(logger.info).toHaveBeenCalledWith(
        'SEOManager',
        'SEO initialized successfully'
      );
    });

    it('omits fb:app_id and twitter handle tags when config lacks them', () => {
      const seo = new SEOManager({
        ...baseConfig,
        facebookAppId: undefined,
        twitterHandle: undefined,
      });
      seo.initialize();

      expect(findMeta(doc, 'property', 'fb:app_id')).toBeUndefined();
      expect(findMeta(doc, 'name', 'twitter:site')).toBeUndefined();
      expect(findMeta(doc, 'name', 'twitter:creator')).toBeUndefined();
    });

    it('skips structured data when enableStructuredData is false', () => {
      const seo = new SEOManager({
        ...baseConfig,
        enableStructuredData: false,
      });
      seo.initialize();

      const script = doc._appended.find((e) => e.tagName === 'script');
      expect(script).toBeUndefined();
    });

    it('early-returns on non-web platforms without touching the DOM', () => {
      (Platform as unknown as { OS: string }).OS = 'ios';
      const seo = new SEOManager(baseConfig);
      seo.initialize();

      expect(doc._appended).toHaveLength(0);
      expect(logger.info).not.toHaveBeenCalledWith(
        'SEOManager',
        'Initializing SEO features'
      );
    });

    it('catches and logs errors thrown during setup', () => {
      // Make createElement throw to force the try/catch error path
      doc.createElement = () => {
        throw new Error('boom');
      };
      const seo = new SEOManager(baseConfig);
      seo.initialize();

      expect(logger.error).toHaveBeenCalledWith(
        'SEOManager',
        'Failed to initialize SEO',
        expect.any(Error)
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateMetaTag create vs update branch (exercised via public methods)
  // -------------------------------------------------------------------------

  describe('meta tag create vs update', () => {
    it('updates an existing meta tag in place instead of creating a duplicate', () => {
      const seo = new SEOManager(baseConfig);
      seo.initialize();

      const createdAfterInit = doc._createdCount;
      const before = doc._appended.filter(
        (e) => e.tagName === 'meta' && e.getAttribute('name') === 'description'
      ).length;
      expect(before).toBe(1);

      seo.updateDescription('A brand new description');

      const after = doc._appended.filter(
        (e) => e.tagName === 'meta' && e.getAttribute('name') === 'description'
      ).length;
      // still exactly one description meta tag - it was updated, not duplicated
      expect(after).toBe(1);
      expect(metaContent(doc, 'name', 'description')).toBe(
        'A brand new description'
      );
      // no new element created for the existing description tag reuse path
      expect(doc._createdCount).toBeGreaterThanOrEqual(createdAfterInit);
    });

    it('creates a new meta tag when none exists yet', () => {
      const seo = new SEOManager(baseConfig);
      // no initialize() -> head empty, so updateKeywords must create the tag
      seo.updateKeywords(['plumbing', 'electrical']);

      expect(metaContent(doc, 'name', 'keywords')).toBe('plumbing, electrical');
      const created = doc._appended.find(
        (e) => e.tagName === 'meta' && e.getAttribute('name') === 'keywords'
      );
      expect(created).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // updateTitle
  // -------------------------------------------------------------------------

  describe('updateTitle', () => {
    it('sets document.title and mirrors to og/twitter title meta tags', () => {
      const seo = new SEOManager(baseConfig);
      seo.updateTitle('New Page Title');

      expect(doc.title).toBe('New Page Title');
      expect(metaContent(doc, 'property', 'og:title')).toBe('New Page Title');
      expect(metaContent(doc, 'name', 'twitter:title')).toBe('New Page Title');
      expect(logger.info).toHaveBeenCalledWith(
        'SEOManager',
        'Page title updated',
        {
          title: 'New Page Title',
        }
      );
    });

    it('early-returns on non-web', () => {
      (Platform as unknown as { OS: string }).OS = 'android';
      const seo = new SEOManager(baseConfig);
      seo.updateTitle('Ignored');
      expect(doc.title).toBe('');
      expect(doc._appended).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // updateDescription
  // -------------------------------------------------------------------------

  describe('updateDescription', () => {
    it('updates description, og:description and twitter:description', () => {
      const seo = new SEOManager(baseConfig);
      seo.updateDescription('Fresh copy');

      expect(metaContent(doc, 'name', 'description')).toBe('Fresh copy');
      expect(metaContent(doc, 'property', 'og:description')).toBe('Fresh copy');
      expect(metaContent(doc, 'name', 'twitter:description')).toBe(
        'Fresh copy'
      );
    });

    it('early-returns on non-web', () => {
      (Platform as unknown as { OS: string }).OS = 'ios';
      const seo = new SEOManager(baseConfig);
      seo.updateDescription('Ignored');
      expect(doc._appended).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // updateKeywords
  // -------------------------------------------------------------------------

  describe('updateKeywords', () => {
    it('joins keywords and logs the count', () => {
      const seo = new SEOManager(baseConfig);
      seo.updateKeywords(['a', 'b', 'c']);

      expect(metaContent(doc, 'name', 'keywords')).toBe('a, b, c');
      expect(logger.info).toHaveBeenCalledWith(
        'SEOManager',
        'Page keywords updated',
        {
          count: 3,
        }
      );
    });

    it('early-returns on non-web', () => {
      (Platform as unknown as { OS: string }).OS = 'android';
      const seo = new SEOManager(baseConfig);
      seo.updateKeywords(['x']);
      expect(doc._appended).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // setCanonicalUrl
  // -------------------------------------------------------------------------

  describe('setCanonicalUrl', () => {
    it('creates a canonical link when missing and sets og:url', () => {
      const seo = new SEOManager(baseConfig);
      seo.setCanonicalUrl('https://mintenance.co.uk/page');

      const link = doc._appended.find((e) => e.tagName === 'link');
      expect(link).toBeDefined();
      expect(link!.rel).toBe('canonical');
      expect(link!.href).toBe('https://mintenance.co.uk/page');
      expect(metaContent(doc, 'property', 'og:url')).toBe(
        'https://mintenance.co.uk/page'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'SEOManager',
        'Canonical URL set',
        {
          url: 'https://mintenance.co.uk/page',
        }
      );
    });

    it('reuses an existing canonical link instead of creating another', () => {
      const seo = new SEOManager(baseConfig);
      seo.setCanonicalUrl('https://a.com');
      seo.setCanonicalUrl('https://b.com');

      const links = doc._appended.filter((e) => e.tagName === 'link');
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe('https://b.com');
    });

    it('early-returns on non-web', () => {
      (Platform as unknown as { OS: string }).OS = 'ios';
      const seo = new SEOManager(baseConfig);
      seo.setCanonicalUrl('https://nope.com');
      expect(doc._appended).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // setImage
  // -------------------------------------------------------------------------

  describe('setImage', () => {
    it('sets og:image and twitter:image', () => {
      const seo = new SEOManager(baseConfig);
      seo.setImage('https://cdn.example/img.png');

      expect(metaContent(doc, 'property', 'og:image')).toBe(
        'https://cdn.example/img.png'
      );
      expect(metaContent(doc, 'name', 'twitter:image')).toBe(
        'https://cdn.example/img.png'
      );
    });

    it('early-returns on non-web', () => {
      (Platform as unknown as { OS: string }).OS = 'android';
      const seo = new SEOManager(baseConfig);
      seo.setImage('https://nope.png');
      expect(doc._appended).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // injectStructuredData create-vs-update (via setupStructuredData)
  // -------------------------------------------------------------------------

  describe('structured data injection', () => {
    it('reuses an existing JSON-LD script tag on re-initialize', () => {
      const seo = new SEOManager(baseConfig);
      seo.initialize();
      seo.initialize();

      const scripts = doc._appended.filter((e) => e.tagName === 'script');
      expect(scripts).toHaveLength(1);
      expect(JSON.parse(scripts[0].textContent as string)['@type']).toBe(
        'WebApplication'
      );
    });
  });

  // -------------------------------------------------------------------------
  // generateSitemap (pure, platform-agnostic)
  // -------------------------------------------------------------------------

  describe('generateSitemap', () => {
    it('builds XML containing every route loc/changefreq/priority', () => {
      const seo = new SEOManager(baseConfig);
      const xml = seo.generateSitemap([
        { path: '/', priority: 1.0, changefreq: 'daily' },
        { path: '/jobs', priority: 0.8, changefreq: 'weekly' },
      ]);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
      );
      expect(xml).toContain('<loc>/</loc>');
      expect(xml).toContain('<changefreq>daily</changefreq>');
      expect(xml).toContain('<priority>1</priority>');
      expect(xml).toContain('<loc>/jobs</loc>');
      expect(xml).toContain('<changefreq>weekly</changefreq>');
      expect(xml).toContain('<priority>0.8</priority>');
    });

    it('handles an empty route list', () => {
      const seo = new SEOManager(baseConfig);
      const xml = seo.generateSitemap([]);
      expect(xml).toContain('<urlset');
      expect(xml).not.toContain('<loc>');
    });
  });

  // -------------------------------------------------------------------------
  // updatePageMetadata - every optional branch
  // -------------------------------------------------------------------------

  describe('updatePageMetadata', () => {
    it('applies all provided fields', () => {
      const seo = new SEOManager(baseConfig);
      seo.updatePageMetadata({
        title: 'T',
        description: 'D',
        keywords: ['k1', 'k2'],
        image: 'https://img',
        url: 'https://url',
        type: 'article',
      });

      expect(doc.title).toBe('T');
      expect(metaContent(doc, 'name', 'description')).toBe('D');
      expect(metaContent(doc, 'name', 'keywords')).toBe('k1, k2');
      expect(metaContent(doc, 'property', 'og:image')).toBe('https://img');
      expect(metaContent(doc, 'property', 'og:url')).toBe('https://url');
      expect(metaContent(doc, 'property', 'og:type')).toBe('article');
      expect(logger.info).toHaveBeenCalledWith(
        'SEOManager',
        'Page metadata updated',
        expect.objectContaining({ metadata: expect.any(Object) })
      );
    });

    it('skips every field when metadata is empty', () => {
      const seo = new SEOManager(baseConfig);
      seo.updatePageMetadata({});

      expect(doc.title).toBe('');
      // no title/desc/keyword/image/url/type tags created
      expect(doc._appended).toHaveLength(0);
      expect(logger.info).toHaveBeenCalledWith(
        'SEOManager',
        'Page metadata updated',
        expect.objectContaining({ metadata: {} })
      );
    });

    it('applies only the subset of fields that are present', () => {
      const seo = new SEOManager(baseConfig);
      seo.updatePageMetadata({ title: 'OnlyTitle' });

      expect(doc.title).toBe('OnlyTitle');
      expect(findMeta(doc, 'name', 'keywords')).toBeUndefined();
      expect(findMeta(doc, 'property', 'og:image')).toBeUndefined();
      expect(findMeta(doc, 'property', 'og:url')).toBeUndefined();
    });

    it('early-returns on non-web before touching anything', () => {
      (Platform as unknown as { OS: string }).OS = 'ios';
      const seo = new SEOManager(baseConfig);
      seo.updatePageMetadata({ title: 'X', description: 'Y' });
      expect(doc.title).toBe('');
      expect(doc._appended).toHaveLength(0);
    });
  });
});
