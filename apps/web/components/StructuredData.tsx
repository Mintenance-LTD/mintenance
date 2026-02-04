import Script from 'next/script';

/**
 * Sanitize string for safe inclusion in JSON-LD scripts
 * Prevents XSS by escaping HTML-sensitive characters
 */
function sanitizeForJsonLd(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\//g, '\\u002f')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

/**
 * Recursively sanitize object for JSON-LD
 */
function sanitizeObjectForJsonLd(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return sanitizeForJsonLd(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectForJsonLd);
  }
  if (obj && typeof obj === 'object') {
    const sanitized: unknown = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObjectForJsonLd(value);
    }
    return sanitized;
  }
  return obj;
}

interface LocalBusinessProps {
  name?: string;
  description?: string;
  url?: string;
  telephone?: string;
  email?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}

export function LocalBusinessStructuredData({
  name = 'Mintenance',
  description = 'Connect with verified contractors for all your home maintenance needs. Get instant quotes, read reviews, and hire trusted professionals.',
  url = 'https://mintenance.com',
  telephone = '+44 20 1234 5678',
  email = 'info@mintenance.com',
  address = {
    streetAddress: '123 High Street',
    addressLocality: 'London',
    addressRegion: 'Greater London',
    postalCode: 'SW1A 1AA',
    addressCountry: 'GB',
  },
  geo = {
    latitude: 51.5074,
    longitude: -0.1278,
  },
  aggregateRating = {
    ratingValue: 4.8,
    reviewCount: 12543,
  },
}: LocalBusinessProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url,
    name,
    description,
    url,
    telephone,
    email,
    address: {
      '@type': 'PostalAddress',
      ...address,
    },
    geo: {
      '@type': 'GeoCoordinates',
      ...geo,
    },
    aggregateRating: aggregateRating
      ? {
          '@type': 'AggregateRating',
          ...aggregateRating,
        }
      : undefined,
    priceRange: '£££',
    openingHours: 'Mo-Su 00:00-24:00',
    sameAs: [
      'https://www.facebook.com/mintenance',
      'https://twitter.com/mintenance',
      'https://www.linkedin.com/company/mintenance',
      'https://www.instagram.com/mintenanceltd/',
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Home Maintenance Services',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Plumbing Services',
            description: 'Professional plumbing repairs and installations',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Electrical Services',
            description: 'Certified electrical work and repairs',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'General Repairs',
            description: 'Handyman and general home maintenance',
          },
        },
      ],
    },
  };

  // Sanitize all user-controlled data before rendering
  const sanitizedData = sanitizeObjectForJsonLd(structuredData);

  return (
    <Script
      id="local-business-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizedData) }}
      strategy="beforeInteractive"
    />
  );
}

interface WebApplicationProps {
  name?: string;
  description?: string;
  url?: string;
  applicationCategory?: string;
  operatingSystem?: string;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  offers?: {
    price: string;
    priceCurrency: string;
  };
}

export function WebApplicationStructuredData({
  name = 'Mintenance Platform',
  description = 'AI-powered platform connecting homeowners with verified contractors for home maintenance and repairs.',
  url = 'https://mintenance.com',
  applicationCategory = 'BusinessApplication',
  operatingSystem = 'Any',
  aggregateRating = {
    ratingValue: 4.8,
    reviewCount: 12543,
  },
  offers = {
    price: '0',
    priceCurrency: 'GBP',
  },
}: WebApplicationProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url,
    applicationCategory,
    operatingSystem,
    aggregateRating: aggregateRating
      ? {
          '@type': 'AggregateRating',
          ...aggregateRating,
        }
      : undefined,
    offers: offers
      ? {
          '@type': 'Offer',
          ...offers,
        }
      : undefined,
    featureList: [
      'AI-powered damage assessment',
      'Instant quotes from verified contractors',
      'Secure payment processing',
      'Real-time messaging',
      'Review and rating system',
      'Job guarantee protection',
      'Background-checked professionals',
      'Mobile app available',
    ],
    screenshot: [
      'https://mintenance.com/screenshots/dashboard.jpg',
      'https://mintenance.com/screenshots/job-posting.jpg',
      'https://mintenance.com/screenshots/contractor-profile.jpg',
    ],
    author: {
      '@type': 'Organization',
      name: 'Mintenance Ltd',
      url: 'https://mintenance.com',
    },
  };

  // Sanitize all user-controlled data before rendering
  const sanitizedData = sanitizeObjectForJsonLd(structuredData);

  return (
    <Script
      id="web-application-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizedData) }}
      strategy="beforeInteractive"
    />
  );
}

interface ContractorProps {
  name: string;
  description: string;
  url: string;
  image?: string;
  telephone?: string;
  email?: string;
  address?: {
    addressLocality: string;
    addressRegion: string;
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  priceRange?: string;
  services?: string[];
}

export function ContractorStructuredData({
  name,
  description,
  url,
  image,
  telephone,
  email,
  address,
  aggregateRating,
  priceRange = '£££',
  services = [],
}: ContractorProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name,
    description,
    url,
    image,
    telephone,
    email,
    address: address
      ? {
          '@type': 'PostalAddress',
          ...address,
          addressCountry: 'GB',
        }
      : undefined,
    aggregateRating: aggregateRating
      ? {
          '@type': 'AggregateRating',
          ...aggregateRating,
        }
      : undefined,
    priceRange,
    hasOfferCatalog: services.length > 0
      ? {
          '@type': 'OfferCatalog',
          name: 'Services Offered',
          itemListElement: services.map((service) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: service,
            },
          })),
        }
      : undefined,
  };

  // Sanitize all user-controlled data before rendering (CRITICAL for contractor data)
  const sanitizedData = sanitizeObjectForJsonLd(structuredData);

  return (
    <Script
      id={`contractor-structured-data-${sanitizeForJsonLd(name).toLowerCase().replace(/\s+/g, '-')}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizedData) }}
      strategy="beforeInteractive"
    />
  );
}

interface FAQProps {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

export function FAQStructuredData({ questions }: FAQProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  // Sanitize all user-controlled data before rendering
  const sanitizedData = sanitizeObjectForJsonLd(structuredData);

  return (
    <Script
      id="faq-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizedData) }}
      strategy="beforeInteractive"
    />
  );
}

interface BreadcrumbProps {
  items: Array<{
    name: string;
    url?: string;
  }>;
}

export function BreadcrumbStructuredData({ items }: BreadcrumbProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  // Sanitize all user-controlled data before rendering
  const sanitizedData = sanitizeObjectForJsonLd(structuredData);

  return (
    <Script
      id="breadcrumb-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(sanitizedData) }}
      strategy="beforeInteractive"
    />
  );
}