/**
 * Statistics section showing key metrics
 * Displays contractor count, jobs completed, and average rating
 */
export function StatsSection() {
  return (
    <section className="py-16 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-primary mb-2">
              10,000+
            </div>
            <div className="text-gray-600">Verified Tradespeople</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-2">
              50,000+
            </div>
            <div className="text-gray-600">Jobs Completed</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-2">
              4.8★
            </div>
            <div className="text-gray-600">Average Rating</div>
          </div>
        </div>
      </div>
    </section>
  );
}
