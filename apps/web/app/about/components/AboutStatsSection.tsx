import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * Statistics section for About page
 * Displays real data: verified contractors, completed jobs, average rating, and customer satisfaction
 */
export async function AboutStatsSection() {
  // Fetch real statistics from the database
  const [
    verifiedContractorsResponse,
    completedJobsResponse,
    reviewsResponse,
  ] = await Promise.all([
    // Count verified contractors (admin_verified = true and role = 'contractor')
    serverSupabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'contractor')
      .eq('admin_verified', true),
    // Count completed jobs
    serverSupabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed'),
    // Fetch all reviews to calculate average rating and satisfaction
    serverSupabase
      .from('reviews')
      .select('rating'),
  ]);

  const verifiedContractors = verifiedContractorsResponse.count || 0;
  const completedJobs = completedJobsResponse.count || 0;
  
  // Calculate average rating from reviews
  const reviews = reviewsResponse.data || [];
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length
    : 0;

  // Calculate customer satisfaction as percentage of reviews that are 4+ stars
  const satisfiedReviews = reviews.filter(review => (review.rating || 0) >= 4).length;
  const customerSatisfaction = reviews.length > 0
    ? Math.round((satisfiedReviews / reviews.length) * 100)
    : 0;

  // Format numbers with + for large values
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      const formatted = (num / 1000).toFixed(num >= 10000 ? 0 : 1);
      return `${formatted.replace(/\.0$/, '')}k+`;
    }
    return `${num}+`;
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary to-primary-light">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-white mb-12 text-center">Mintenance By The Numbers</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-5xl font-bold text-secondary mb-2">
              {formatNumber(verifiedContractors)}
            </div>
            <div className="text-xl text-gray-300">Verified Tradespeople</div>
          </div>
          <div>
            <div className="text-5xl font-bold text-secondary mb-2">
              {formatNumber(completedJobs)}
            </div>
            <div className="text-xl text-gray-300">Jobs Completed</div>
          </div>
          <div>
            <div className="text-5xl font-bold text-secondary mb-2">
              {averageRating > 0 ? `${averageRating.toFixed(1)}★` : 'N/A'}
            </div>
            <div className="text-xl text-gray-300">Average Rating</div>
          </div>
          <div>
            <div className="text-5xl font-bold text-secondary mb-2">
              {customerSatisfaction}%
            </div>
            <div className="text-xl text-gray-300">Customer Satisfaction</div>
          </div>
        </div>
      </div>
    </section>
  );
}

