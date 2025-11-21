import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public API endpoint to fetch featured testimonials for the landing page
 * Returns reviews that are marked as featured and visible
 */
export async function GET() {
    try {
        // Fetch featured reviews with reviewer and job information
        // If no featured reviews exist, get top-rated visible reviews
        let { data: reviews, error } = await serverSupabase
            .from('reviews')
            .select(`
                id,
                rating,
                review_text,
                title,
                is_featured,
                is_verified,
                created_at,
                job_id,
                reviewer_id,
                jobs!reviews_job_id_fkey (
                    id,
                    title,
                    category,
                    budget
                )
            `)
            .eq('is_visible', true)
            .eq('is_featured', true)
            .order('created_at', { ascending: false })
            .limit(6);

        // If no featured reviews found, get top-rated visible reviews
        if (!reviews || reviews.length === 0) {
            const { data: allReviews } = await serverSupabase
                .from('reviews')
                .select(`
                    id,
                    rating,
                    review_text,
                    title,
                    is_featured,
                    is_verified,
                    created_at,
                    job_id,
                    reviewer_id,
                    jobs!reviews_job_id_fkey (
                        id,
                        title,
                        category,
                        budget
                    )
                `)
                .eq('is_visible', true)
                .order('rating', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(6);
            
            if (allReviews) {
                reviews = allReviews;
                error = null;
            }
        }

        if (error) {
            logger.error('Failed to fetch testimonials', error, {
                service: 'testimonials-api',
            });
            // Return empty array instead of error for graceful degradation
            return NextResponse.json({ testimonials: [] });
        }

        // Fetch reviewer information separately
        const reviewerIds = [...new Set((reviews || []).map((r: any) => r.reviewer_id).filter(Boolean))];
        let reviewerMap = new Map();
        
        if (reviewerIds.length > 0) {
            const { data: reviewers, error: reviewerError } = await serverSupabase
                .from('users')
                .select('id, first_name, last_name, email')
                .in('id', reviewerIds);

            if (reviewerError) {
                logger.warn('Failed to fetch reviewer information', {
                    service: 'testimonials-api',
                    error: reviewerError,
                });
            } else {
                reviewerMap = new Map((reviewers || []).map((r: any) => [r.id, r]));
            }
        }

        // Transform reviews to testimonial format
        const testimonials = (reviews || []).map((review: any) => {
            const reviewer = reviewerMap.get(review.reviewer_id) || {};
            const job = Array.isArray(review.jobs) ? review.jobs[0] : review.jobs || {};
            
            // Calculate savings (simplified - could be enhanced with actual cost comparison)
            const savings = job.budget 
                ? `£${Math.round(Number(job.budget) * 0.15)}` // Estimate 15% savings
                : 'Contact for quote';

            // Get location from user email domain or default
            const location = reviewer.email?.split('@')[1]?.includes('co.uk') 
                ? 'UK' 
                : 'London'; // Default fallback

            return {
                id: review.id,
                name: `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim() || 'Anonymous',
                location: location,
                role: 'Homeowner',
                rating: review.rating || 5,
                text: review.review_text || review.title || 'Great service!',
                project: job.title || job.category || 'Home Improvement',
                savings: savings,
                avatar: getAvatarEmoji(reviewer.first_name || ''),
                verified: review.is_verified || false,
                createdAt: review.created_at,
            };
        });

        return NextResponse.json({ testimonials });

    } catch (error) {
        logger.error('Testimonials API error', error, {
            service: 'testimonials-api',
        });
        
        // Return empty array for graceful degradation
        return NextResponse.json({ testimonials: [] });
    }
}

/**
 * Get avatar emoji based on name (simple hash-based selection)
 */
function getAvatarEmoji(name: string): string {
    const avatars = ['👩‍💼', '👨‍💻', '👩‍🎨', '👨‍🔧', '👩‍🏫', '👨‍💼', '👩‍⚕️', '👨‍🎓'];
    if (!name) return avatars[0];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return avatars[hash % avatars.length];
}

