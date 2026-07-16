import type { Metadata } from 'next';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getAppUrl } from '@/lib/env';
import ContractorProfileClient from './ContractorProfileClient';

// Profile content is user-specific and changes over time; render at request
// time so generateMetadata below always reflects the current profile (and never
// runs a DB call at build time).
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * Server-rendered SEO metadata for the public contractor profile (audit F1/F2).
 * This route is a primary organic-search landing page and previously shipped
 * NO per-page metadata (the whole app had zero generateMetadata) — every
 * contractor page inherited a generic default title/description with no OG tags.
 * We fetch the profile server-side (service-role read is fine here — public,
 * non-sensitive fields only) and emit a real title/description/canonical/OG.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  try {
    const { data: c } = await serverSupabase
      .from('profiles')
      .select(
        'first_name, last_name, company_name, bio, city, country, profile_image_url, role, rating'
      )
      .eq('id', id)
      .eq('role', 'contractor')
      .single();

    if (!c) {
      return {
        title: 'Contractor not found | Mintenance',
        robots: { index: false, follow: false },
      };
    }

    const name =
      c.company_name ||
      [c.first_name, c.last_name].filter(Boolean).join(' ') ||
      'Contractor';
    const place = [c.city, c.country].filter(Boolean).join(', ');
    const title = `${name}${place ? ` — ${place}` : ''} | Mintenance`;

    const ratingSuffix =
      typeof c.rating === 'number' && c.rating > 0
        ? ` Rated ${c.rating.toFixed(1)}★.`
        : '';
    const raw =
      (typeof c.bio === 'string' && c.bio.trim()) ||
      `View ${name}'s verified profile, reviews and completed work on Mintenance.${ratingSuffix}`;
    const description = raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;

    const url = `${getAppUrl()}/contractors/${id}`;
    const images = c.profile_image_url
      ? [{ url: c.profile_image_url }]
      : undefined;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        type: 'profile',
        siteName: 'Mintenance',
        ...(images ? { images } : {}),
      },
      twitter: {
        card: 'summary',
        title,
        description,
        ...(images ? { images: images.map((i) => i.url) } : {}),
      },
    };
  } catch {
    // Never let a metadata fetch failure break the page render.
    return { title: 'Contractor profile | Mintenance' };
  }
}

export default function ContractorProfilePage() {
  // All interactivity + client-side data fetching lives in the client
  // component; this server shell exists to own generateMetadata above.
  return <ContractorProfileClient />;
}
