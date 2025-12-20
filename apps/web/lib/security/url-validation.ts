/**
 * URL Validation Utility for SSRF Protection
 * 
 * Validates URLs to prevent Server-Side Request Forgery (SSRF) attacks by:
 * - Checking against allowlist of trusted domains
 * - Blocking private/internal IP addresses
 * - Blocking non-HTTP(S) protocols
 * - Validating URL format strictly
 */

import { logger } from '@mintenance/shared';

export interface URLValidationResult {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
}

/**
 * Private/internal IP ranges that should be blocked
 */
const PRIVATE_IP_RANGES = [
  // IPv4 private ranges
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  // Link-local
  { start: '169.254.0.0', end: '169.254.255.255' },
  // Cloud metadata services
  { start: '169.254.169.254', end: '169.254.169.254' },
];

/**
 * Allowed domains for image URLs (Supabase storage, CDN, etc.)
 * This should be configured via environment variables
 */
function getAllowedDomains(): string[] {
  const domains = [
    // Supabase storage domains
    '.supabase.co',
    '.supabase.in',
    // Add your CDN domains here
  ];

  // Allow custom domains from environment
  // Format: ALLOWED_IMAGE_DOMAINS=example.com,cdn.example.com,another-domain.com
  const customDomainsEnv = process.env.ALLOWED_IMAGE_DOMAINS;
  if (customDomainsEnv) {
    const customDomains = customDomainsEnv
      .split(',')
      .map(domain => domain.trim())
      .filter(domain => domain.length > 0);
    return [...domains, ...customDomains];
  }
  
  return domains;
}

/**
 * Convert IP address string to number for comparison
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Check if an IP address is in a private range
 */
function isPrivateIP(ip: string): boolean {
  const ipNum = ipToNumber(ip);
  
  for (const range of PRIVATE_IP_RANGES) {
    const startNum = ipToNumber(range.start);
    const endNum = ipToNumber(range.end);
    if (ipNum >= startNum && ipNum <= endNum) {
      return true;
    }
  }
  
  return false;
}

/**
 * Resolve hostname to IP and check if it's private
 * Note: This is a basic check. In production, you might want to use DNS resolution
 */
async function checkHostnameForPrivateIP(hostname: string): Promise<boolean> {
  // Direct IP address check
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    return isPrivateIP(hostname);
  }

  // Check for localhost variants
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  // Check for internal hostnames
  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return true;
  }

  // Check for cloud metadata hostnames
  if (hostname.includes('metadata') || hostname.includes('169.254.169.254')) {
    return true;
  }

  return false;
}

/**
 * Validate URL against allowlist
 */
function isAllowedDomain(url: URL): boolean {
  const allowedDomains = getAllowedDomains();
  const hostname = url.hostname.toLowerCase();

  // Check if hostname matches any allowed domain
  for (const domain of allowedDomains) {
    // Normalize domain: ensure it has a leading dot for subdomain matching
    const normalizedDomain = domain.startsWith('.') ? domain : '.' + domain;
    const domainWithoutDot = normalizedDomain.slice(1);
    
    // Check exact match (for domains without subdomains)
    if (hostname === domainWithoutDot) {
      return true;
    }
    
    // Check if hostname ends with the normalized domain (for subdomains)
    // e.g., "abc123.supabase.co" ends with ".supabase.co"
    if (hostname.endsWith(normalizedDomain)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate and sanitize a URL to prevent SSRF attacks
 * 
 * @param urlString - The URL string to validate
 * @param requireAllowlist - If true, URL must be in allowlist. If false, only blocks private IPs
 * @returns Validation result with normalized URL if valid
 */
export async function validateURL(
  urlString: string,
  requireAllowlist: boolean = true
): Promise<URLValidationResult> {
  try {
    // Basic format validation
    if (!urlString || typeof urlString !== 'string') {
      return {
        isValid: false,
        error: 'URL must be a non-empty string',
      };
    }

    // Remove leading/trailing whitespace
    const trimmedUrl = urlString.trim();
    
    if (trimmedUrl.length === 0) {
      return {
        isValid: false,
        error: 'URL cannot be empty',
      };
    }

    // Reject file:/// URLs (local file paths)
    if (trimmedUrl.startsWith('file:///') || trimmedUrl.startsWith('file://')) {
      return {
        isValid: false,
        error: 'File URLs are not allowed. Images must be uploaded to cloud storage.',
      };
    }

    // Parse URL
    let url: URL;
    try {
      url = new URL(trimmedUrl);
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid URL format',
      };
    }

    // Only allow HTTP and HTTPS protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return {
        isValid: false,
        error: `Protocol ${url.protocol} is not allowed. Only HTTP and HTTPS are permitted.`,
      };
    }

    // Prefer HTTPS
    if (url.protocol === 'http:') {
      logger.warn('HTTP URL used, should use HTTPS', {
        service: 'url-validation',
        url: trimmedUrl,
      });
    }

    // Check for private IP addresses
    const isPrivate = await checkHostnameForPrivateIP(url.hostname);
    if (isPrivate) {
      logger.warn('Blocked private IP address', {
        service: 'url-validation',
        hostname: url.hostname,
        url: trimmedUrl,
      });
      return {
        isValid: false,
        error: 'Access to private/internal IP addresses is not allowed',
      };
    }

    // If allowlist is required, check against allowed domains
    if (requireAllowlist) {
      if (!isAllowedDomain(url)) {
        logger.warn('URL not in allowlist', {
          service: 'url-validation',
          hostname: url.hostname,
          url: trimmedUrl,
        });
        return {
          isValid: false,
          error: `Domain ${url.hostname} is not in the allowed list`,
        };
      }
    }

    // Normalize URL (remove default ports, lowercase hostname)
    const normalizedUrl = `${url.protocol}//${url.hostname.toLowerCase()}${url.pathname}${url.search}${url.hash}`;

    return {
      isValid: true,
      normalizedUrl,
    };
  } catch (error) {
    logger.error('Error validating URL', error, {
      service: 'url-validation',
      url: urlString,
    });
    return {
      isValid: false,
      error: 'Failed to validate URL',
    };
  }
}

/**
 * Validate multiple URLs (for batch operations)
 */
export async function validateURLs(
  urls: string[],
  requireAllowlist: boolean = true
): Promise<{ valid: string[]; invalid: Array<{ url: string; error: string }> }> {
  const results = await Promise.all(
    urls.map(async (url) => {
      const validation = await validateURL(url, requireAllowlist);
      return { url, validation };
    })
  );

  const valid: string[] = [];
  const invalid: Array<{ url: string; error: string }> = [];

  for (const { url, validation } of results) {
    if (validation.isValid && validation.normalizedUrl) {
      valid.push(validation.normalizedUrl);
    } else {
      invalid.push({
        url,
        error: validation.error || 'Unknown validation error',
      });
    }
  }

  return { valid, invalid };
}

/**
 * Validate that URLs are from Supabase storage
 */
export async function validateSupabaseStorageURL(urlString: string): Promise<URLValidationResult> {
  const result = await validateURL(urlString, true);
  
  if (!result.isValid) {
    return result;
  }

  // Additional check: ensure it's a Supabase storage URL
  const url = new URL(result.normalizedUrl!);
  if (!url.hostname.includes('supabase.co') && !url.hostname.includes('supabase.in')) {
    return {
      isValid: false,
      error: 'URL must be from Supabase storage',
    };
  }

  return result;
}

/**
 * Get allowed domains for image URLs (for client-side validation hints)
 */
export function getAllowedImageDomains(): string[] {
  return getAllowedDomains();
}

