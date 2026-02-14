import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { z } from 'zod';
import { sanitizeText, sanitizeMessage } from '@/lib/sanitizer';

export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor access required');
    }

    const supabase = serverSupabase;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const postType = searchParams.get('post_type');
    const search = searchParams.get('search');
    const location = searchParams.get('location');
    const sort = searchParams.get('sort') || 'newest';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const followingOnly = searchParams.get('following') === 'true';

    let posts: Array<{ contractor_id?: string; [key: string]: unknown }> = [];
    let postsError: unknown = null;

    // SECURITY FIX: Use secure RPC function for search queries
    if (search && search.trim().length > 0) {
      const sanitizedSearch = search.substring(0, 100).trim();

      // Use secure full-text search RPC function
      const { data, error } = await supabase.rpc('search_contractor_posts', {
        search_text: sanitizedSearch,
        post_type_filter: (postType && postType !== 'all') ? postType : null,
        is_active_filter: true,
        is_flagged_filter: false,
        limit_count: limit,
        offset_count: offset,
        sort_by: sort === 'relevance' ? 'relevance' : sort,
      });

      posts = data || [];
      postsError = error;

      // Filter by following if needed
      if (followingOnly && !postsError && posts.length > 0) {
        const { data: following } = await supabase
          .from('contractor_follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = new Set(following?.map(f => f.following_id) || []);
        if (followingIds.size > 0) {
          posts = posts.filter(p => followingIds.has(p.contractor_id));
        } else {
          posts = [];
        }
      }
    } else {
      // No search - use regular query builder
      let query = supabase
        .from('contractor_posts')
        .select(`
          *,
          contractor:contractor_id (
            id,
            first_name,
            last_name,
            profile_image_url,
            city,
            country
          )
        `)
        .eq('is_active', true)
        .eq('is_flagged', false);

      // Filter by post type
      if (postType && postType !== 'all') {
        query = query.eq('post_type', postType);
      }

      // Filter by following only
      if (followingOnly) {
        const { data: following } = await supabase
          .from('contractor_follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = following?.map(f => f.following_id) || [];
        if (followingIds.length > 0) {
          query = query.in('contractor_id', followingIds);
        } else {
          return NextResponse.json({ posts: [], total: 0 });
        }
      }

      // Apply sorting
      switch (sort) {
        case 'popular':
          query = query.order('likes_count', { ascending: false });
          break;
        case 'most_commented':
          query = query.order('comments_count', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;
      posts = data || [];
      postsError = error;
    }

    if (postsError) {
      logger.error('Error fetching posts', postsError, {
        service: 'contractor_posts',
        userId: user.id,
      });
      throw postsError;
    }

    // Fetch user's likes
    const { data: userLikes } = await supabase
      .from('contractor_post_likes')
      .select('post_id')
      .eq('contractor_id', user.id);

    const likedPostIds = new Set(userLikes?.map(like => like.post_id) || []);

    // Map posts to include liked status and format images
    interface PostRecord {
      id: string;
      title?: string;
      content?: string;
      images?: unknown;
      post_type?: string;
      created_at?: string;
      likes_count?: number;
      comments_count?: number;
      shares_count?: number;
      views_count?: number;
      contractor?: {
        id: string;
        first_name?: string;
        last_name?: string;
        profile_image_url?: string;
        city?: string;
        country?: string;
      };
    }

    const formattedPosts = ((posts || []) as unknown as PostRecord[]).map((post: PostRecord) => ({
      id: String(post.id || ''),
      title: post.title || '',
      content: post.content || '',
      images: Array.isArray(post.images) ? post.images : [],
      post_type: post.post_type,
      created_at: post.created_at,
      likes_count: post.likes_count || 0,
      comments_count: post.comments_count || 0,
      shares_count: post.shares_count || 0,
      views_count: post.views_count || 0,
      liked: likedPostIds.has(post.id),
      contractor: post.contractor ? {
        id: post.contractor.id,
        first_name: post.contractor.first_name,
        last_name: post.contractor.last_name,
        profile_image_url: post.contractor.profile_image_url,
        city: post.contractor.city,
        country: post.contractor.country,
      } : null,
    }));

    return NextResponse.json({ 
      posts: formattedPosts,
      total: formattedPosts.length,
      limit,
      offset
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor access required');
    }

    const supabase = serverSupabase;

    const body = await request.json();

    // Create validation schema with sanitization
    const postSchema = z.object({
      title: z.string().min(1).max(200).transform(val => sanitizeText(val, 200)),
      content: z.string().min(1).max(5000).transform(val => sanitizeMessage(val)),
      images: z.array(z.string().url()).max(10).optional().default([]),
      post_type: z.enum(['work_showcase', 'help_request', 'tip_share', 'equipment_share', 'referral_request']).optional().default('work_showcase'),
      job_id: z.string().uuid().optional(),
      skills_used: z.array(z.string()).optional(),
      materials_used: z.array(z.string()).optional(),
      project_duration: z.string().optional(),
      project_cost: z.number().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      location_radius: z.number().optional().default(50),
    });

    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestError('Invalid post data: ' + parsed.error.message);
    }

    const {
      title,
      content,
      images,
      post_type,
      job_id,
      skills_used,
      materials_used,
      project_duration,
      project_cost,
      latitude,
      longitude,
      location_radius
    } = parsed.data;

    // Create post
    const { data: post, error: postError } = await supabase
      .from('contractor_posts')
      .insert({
        contractor_id: user.id,
        title,
        content,
        post_type,
        images,
        job_id: job_id || null,
        skills_used: skills_used || null,
        materials_used: materials_used || null,
        project_duration: project_duration || null,
        project_cost: project_cost || null,
        latitude: latitude || null,
        longitude: longitude || null,
        location_radius: location_radius || 50,
        is_active: true,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        views_count: 0,
      })
      .select(`
        *,
        contractor:contractor_id (
          id,
          first_name,
          last_name,
          profile_image_url,
          city,
          country
        )
      `)
      .single();

    if (postError) {
      logger.error('Error creating post', postError, {
        service: 'contractor_posts',
        userId: user.id,
      });
      throw postError;
    }

    const formattedPost = {
      id: post.id,
      title: post.title || '',
      content: post.content || '',
      images: Array.isArray(post.images) ? post.images : [],
      post_type: post.post_type,
      created_at: post.created_at,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      views_count: 0,
      liked: false,
      contractor: post.contractor ? {
        id: post.contractor.id,
        first_name: post.contractor.first_name,
        last_name: post.contractor.last_name,
        profile_image_url: post.contractor.profile_image_url,
        city: post.contractor.city,
        country: post.contractor.country,
      } : null,
    };

    return NextResponse.json({ post: formattedPost }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}

