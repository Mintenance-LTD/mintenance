import { MetadataRoute } from 'next';
import { serverSupabase } from '@/lib/api/supabaseServer';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';

  // Static pages
  const staticPages = [
    '',
    '/about',
    '/how-it-works',
    '/contractors',
    '/pricing',
    '/help',
    '/contact',
    '/login',
    '/register',
    '/privacy',
    '/terms',
    '/cookies',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Category pages
  const categories = [
    'plumber',
    'electrician',
    'carpenter',
    'painter',
    'roofer',
    'hvac',
    'handyman',
    'cleaner',
    'landscaper',
    'locksmith',
  ].map((category) => ({
    url: `${baseUrl}/contractors/${category}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Location pages (major UK cities)
  const locations = [
    'london',
    'manchester',
    'birmingham',
    'glasgow',
    'liverpool',
    'bristol',
    'sheffield',
    'leeds',
    'edinburgh',
    'leicester',
  ].map((city) => ({
    url: `${baseUrl}/contractors/in/${city}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Help center pages
  const helpPages = [
    '/help/getting-started',
    '/help/homeowner-guide',
    '/help/contractor-guide',
    '/help/payments',
    '/help/safety',
    '/help/disputes',
    '/help/account',
    '/help/trust-and-safety',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  // Blog posts (if applicable)
  const blogPosts = [
    '/blog/how-to-choose-contractor',
    '/blog/home-maintenance-tips',
    '/blog/cost-guide-uk-renovations',
    '/blog/emergency-repairs-guide',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Dynamic contractor profiles from database
  let contractorProfiles: MetadataRoute.Sitemap = [];
  try {
    const { data: contractors } = await serverSupabase
      .from('profiles')
      .select('id, updated_at')
      .eq('role', 'contractor')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (contractors && contractors.length > 0) {
      contractorProfiles = contractors.map((contractor) => ({
        url: `${baseUrl}/contractor/${contractor.id}`,
        lastModified: contractor.updated_at || new Date().toISOString(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch {
    // Gracefully degrade — return empty array on DB failure
    contractorProfiles = [];
  }

  return [
    ...staticPages,
    ...categories,
    ...locations,
    ...helpPages,
    ...blogPosts,
    ...contractorProfiles,
  ];
}
