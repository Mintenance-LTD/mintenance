import { MetadataRoute } from 'next';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { MINTENANCE_PUBLIC_ORIGIN } from '@/lib/marketing/public-journey';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = MINTENANCE_PUBLIC_ORIGIN;

  // Static pages
  const staticPages = [
    '/',
    '/about',
    '/how-it-works',
    '/for-homeowners',
    '/for-contractors',
    '/for-letting-agents',
    '/contractors',
    '/pricing',
    '/help',
    '/help/payments/how-payments-work',
    '/help/posting-jobs/how-to-post-a-job',
    '/faq',
    '/contact',
    '/privacy',
    '/terms',
    '/cookies',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: 'monthly' as const,
    priority: route === '/' ? 1 : 0.8,
  }));

  // Dynamic contractor profiles from database
  let contractorProfiles: MetadataRoute.Sitemap = [];
  try {
    const { data: contractors } = await serverSupabase
      .from('profiles')
      .select('id, updated_at')
      .eq('role', 'contractor')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(500);

    if (contractors && contractors.length > 0) {
      contractorProfiles = contractors.map((contractor) => ({
        url: `${baseUrl}/contractors/${contractor.id}`,
        lastModified: contractor.updated_at || undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch {
    // Gracefully degrade — return empty array on DB failure
    contractorProfiles = [];
  }

  return [...staticPages, ...contractorProfiles];
}
