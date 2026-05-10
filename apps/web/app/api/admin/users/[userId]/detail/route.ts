import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

// UUID v4 pattern. Line 59 interpolates `userId` into a PostgREST `.or()`
// filter DSL string, which is NOT auto-escaped by supabase-js. A non-UUID
// path segment could inject extra filter clauses (commas, dots, parens).
// Admin-only route so threat model is narrow, but we still validate at
// the boundary — cheaper than reasoning about every interpolation site.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/admin/users/[userId]/detail
 * Fetches comprehensive user detail for the admin user detail page.
 * Includes profile, job counts, bid counts, review stats, escrow history,
 * and recent activity (notifications).
 */
// Audit P1 (2026-05-10): full single-user PII dossier — profile, jobs,
// bids, escrow history, notifications. A stolen admin session could
// enumerate UUIDs and pull a complete dossier per target. Gate behind
// fresh MFA, same 15-min window as the mutating admin routes.
export const GET = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 10 },
    csrf: false,
    requireMfaVerifiedWithinMinutes: 15,
  },
  async (request: NextRequest, { params }) => {
    const { userId } = params;

    if (typeof userId !== 'string' || !UUID_RE.test(userId)) {
      throw new BadRequestError('userId must be a valid UUID');
    }

    // 1. Fetch user profile
    const { data: profile, error: profileError } = await serverSupabase
      .from('profiles')
      .select(
        'id, email, first_name, last_name, role, phone, profile_image_url, company_name, license_number, business_address, latitude, longitude, insurance_provider, insurance_policy_number, insurance_expiry_date, years_experience, admin_verified, bio, created_at, updated_at'
      )
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      logger.error('Error fetching user for admin detail', {
        userId,
        error: profileError?.message,
      });
      throw new NotFoundError('User not found');
    }

    // 2. Fetch all related data in parallel for performance
    const [
      jobsPostedResult,
      jobsCompletedResult,
      bidsResult,
      bidsWonResult,
      reviewsReceivedResult,
      reviewsGivenResult,
      escrowAsPayerResult,
      escrowAsPayeeResult,
      recentNotificationsResult,
    ] = await Promise.all([
      // Jobs posted by user (as homeowner)
      serverSupabase
        .from('jobs')
        .select('id, title, status, category, created_at', { count: 'exact' })
        .eq('homeowner_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),

      // Jobs completed (as either party)
      serverSupabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .or(`homeowner_id.eq.${userId},contractor_id.eq.${userId}`)
        .eq('status', 'completed'),

      // Bids sent (contractor)
      serverSupabase
        .from('bids')
        .select('id', { count: 'exact', head: true })
        .eq('contractor_id', userId),

      // Bids won
      serverSupabase
        .from('bids')
        .select('id', { count: 'exact', head: true })
        .eq('contractor_id', userId)
        .eq('status', 'accepted'),

      // Reviews received
      serverSupabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewer_id', {
          count: 'exact',
        })
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),

      // Reviews given
      serverSupabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewee_id', {
          count: 'exact',
        })
        .eq('reviewer_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),

      // Escrow as payer (homeowner spending)
      serverSupabase
        .from('escrow_transactions')
        .select('id, amount, status, created_at, job_id')
        .eq('payer_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),

      // Escrow as payee (contractor earnings)
      serverSupabase
        .from('escrow_transactions')
        .select('id, amount, status, created_at, job_id')
        .eq('payee_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),

      // Recent notifications (activity)
      serverSupabase
        .from('notifications')
        .select('id, type, title, message, read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // 3. Compute review stats
    const reviewsReceived = reviewsReceivedResult.data ?? [];
    const avgRating =
      reviewsReceived.length > 0
        ? reviewsReceived.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
          reviewsReceived.length
        : 0;

    // 4. Compute payment totals
    const escrowAsPayer = escrowAsPayerResult.data ?? [];
    const escrowAsPayee = escrowAsPayeeResult.data ?? [];
    const totalSpent = escrowAsPayer
      .filter((e) => e.status === 'released' || e.status === 'completed')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalEarned = escrowAsPayee
      .filter((e) => e.status === 'released' || e.status === 'completed')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // 5. Format jobs for response
    const recentJobs = (jobsPostedResult.data ?? []).map((j) => ({
      id: j.id,
      title: j.title,
      status: j.status,
      category: j.category,
      createdAt: j.created_at,
    }));

    // If user is a contractor, also fetch jobs assigned to them
    let contractorJobs: typeof recentJobs = [];
    if (profile.role === 'contractor') {
      const { data: assignedJobs } = await serverSupabase
        .from('jobs')
        .select('id, title, status, category, created_at')
        .eq('contractor_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      contractorJobs = (assignedJobs ?? []).map((j) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        category: j.category,
        createdAt: j.created_at,
      }));
    }

    // 6. Format payment history
    const paymentHistory = [
      ...escrowAsPayer.map((e) => ({
        id: e.id,
        type: 'payment' as const,
        amount: Number(e.amount) || 0,
        status: e.status,
        jobId: e.job_id,
        createdAt: e.created_at,
      })),
      ...escrowAsPayee.map((e) => ({
        id: e.id,
        type: 'earning' as const,
        amount: Number(e.amount) || 0,
        status: e.status,
        jobId: e.job_id,
        createdAt: e.created_at,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 7. Format activity timeline
    const activity = (recentNotificationsResult.data ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: profile.id,
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          role: profile.role,
          phone: profile.phone,
          profileImageUrl: profile.profile_image_url,
          companyName: profile.company_name,
          licenseNumber: profile.license_number,
          businessAddress: profile.business_address,
          insuranceProvider: profile.insurance_provider,
          insuranceExpiryDate: profile.insurance_expiry_date,
          yearsExperience: profile.years_experience,
          adminVerified: profile.admin_verified,
          bio: profile.bio,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        },
        stats: {
          jobsPosted: jobsPostedResult.count ?? 0,
          jobsCompleted: jobsCompletedResult.count ?? 0,
          bidsSent: bidsResult.count ?? 0,
          bidsWon: bidsWonResult.count ?? 0,
          avgRating: Math.round(avgRating * 10) / 10,
          reviewCount: reviewsReceivedResult.count ?? 0,
          totalSpent,
          totalEarned,
        },
        recentJobs,
        contractorJobs,
        reviewsReceived: reviewsReceived.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.created_at,
          reviewerId: r.reviewer_id,
        })),
        reviewsGiven: (reviewsGivenResult.data ?? []).map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.created_at,
          revieweeId: r.reviewee_id,
        })),
        paymentHistory,
        activity,
      },
    });
  }
);
