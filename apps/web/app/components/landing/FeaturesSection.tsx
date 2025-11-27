import Image from 'next/image';

/**
 * AI-powered features section highlighting smart capabilities
 */
export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-gradient-to-br from-primary to-primary-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Image 
              src="/assets/icon.png" 
              alt="Mintenance" 
              width={48} 
              height={48} 
              className="w-12 h-12" 
            />
            <h2 className="text-4xl font-bold text-white">Powered by AI</h2>
          </div>
          <p className="text-xl text-gray-300">
            Smart technology for better matches and faster results
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">Smart Job Analysis</h3>
            <p className="text-gray-300">
              Our AI analyses your job description and automatically suggests the right category, budget range, and timeline.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <div className="w-16 h-16 bg-accent rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">Intelligent Matching</h3>
            <p className="text-gray-300">
              Advanced algorithms match you with the most qualified tradespeople based on skills, location, ratings, and availability.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <div className="w-16 h-16 bg-pink-500 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">Predictive Recommendations</h3>
            <p className="text-gray-300">
              Get personalised suggestions for maintenance schedules, seasonal work, and cost-saving opportunities.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
