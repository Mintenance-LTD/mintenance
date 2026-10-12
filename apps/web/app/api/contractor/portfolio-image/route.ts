import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { isPublishedPortfolioImage } from '@/lib/contractor-portfolio';

export const DELETE = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user }) => {
    const parsed = z
      .object({ url: z.string().url() })
      .strict()
      .safeParse(await request.json());
    if (!parsed.success || !isPublishedPortfolioImage(parsed.data.url))
      throw new BadRequestError('Invalid portfolio image');
    const url = parsed.data.url;
    const [posts, profile] = await Promise.all([
      serverSupabase
        .from('contractor_posts')
        .select('id, media_urls, is_active')
        .eq('contractor_id', user.id)
        .eq('post_type', 'portfolio')
        .contains('media_urls', [url]),
      serverSupabase
        .from('profiles')
        .select('portfolio_images')
        .eq('id', user.id)
        .single(),
    ]);
    if (posts.error || profile.error)
      throw new InternalServerError('Could not load portfolio');
    for (const post of posts.data ?? []) {
      const remaining = (post.media_urls ?? []).filter(
        (image: string) => image !== url
      );
      const { error } = await serverSupabase
        .from('contractor_posts')
        .update(
          remaining.length ? { media_urls: remaining } : { is_active: false }
        )
        .eq('id', post.id)
        .eq('contractor_id', user.id);
      if (error)
        throw new InternalServerError(
          'Could not remove portfolio image. Please retry.'
        );
    }
    const { error } = await serverSupabase
      .from('profiles')
      .update({
        portfolio_images: (profile.data?.portfolio_images ?? []).filter(
          (image: string) => image !== url
        ),
      })
      .eq('id', user.id);
    if (error)
      throw new InternalServerError(
        'Could not finish removing portfolio image. Please retry.'
      );
    // Unlist from the profile; do not delete storage objects referenced elsewhere.
    return NextResponse.json({ success: true });
  }
);
