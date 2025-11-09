import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * Statistics section showing key metrics
 * Displays contractor count, jobs completed, and average rating
 * Uses real data from the database
 */
export async function StatsSection() {
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
    // Fetch all reviews to calculate average rating
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

  // Format numbers with + for large values
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}k+`;
    }
    return num.toString();
  };

  return (
    <section className="py-16 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-primary mb-2">
              {formatNumber(verifiedContractors)}
            </div>
            <div className="text-gray-600">Verified Tradespeople</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-2">
              {formatNumber(completedJobs)}
            </div>
            <div className="text-gray-600">Jobs Completed</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-2">
              {averageRating > 0 ? `${averageRating.toFixed(1)}★` : 'N/A'}
            </div>
            <div className="text-gray-600">Average Rating</div>
          </div>
        </div>
      </div>
    </section>
  );
}
