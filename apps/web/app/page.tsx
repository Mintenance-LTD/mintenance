import Link from 'next/link';
import Logo from './components/Logo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Logo className="w-10 h-10" />
              <span className="ml-3 text-xl font-bold text-[#0F172A]">Mintenance</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#how-it-works" className="text-gray-700 hover:text-[#10B981] transition-colors">
                How It Works
              </a>
              <a href="#services" className="text-gray-700 hover:text-[#10B981] transition-colors">
                Services
              </a>
              <a href="#features" className="text-gray-700 hover:text-[#10B981] transition-colors">
                Features
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-[#0F172A] hover:text-[#10B981] font-medium transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="bg-[#10B981] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#059669] transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0F172A] to-[#1e293b]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Find Trusted Tradespeople
              <br />
              <span className="text-[#10B981]">For Your Home</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Connect with verified, skilled tradespeople in your area. Post your job, receive competitive quotes, and get the work done right.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register?role=homeowner"
                className="bg-[#10B981] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#059669] transition-colors"
              >
                I Need a Tradesperson
              </Link>
              <Link
                href="/register?role=contractor"
                className="bg-white text-[#0F172A] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
              >
                I'm a Tradesperson
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-[#0F172A] mb-2">10,000+</div>
              <div className="text-gray-600">Verified Tradespeople</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#0F172A] mb-2">50,000+</div>
              <div className="text-gray-600">Jobs Completed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#0F172A] mb-2">4.8★</div>
              <div className="text-gray-600">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#0F172A] mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Getting started is simple and straightforward</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-[#0F172A] mb-3">1. Post Your Job</h3>
              <p className="text-gray-600">
                Describe your home maintenance or repair needs with photos and details. It takes less than 2 minutes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-[#F59E0B] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-[#0F172A] mb-3">2. Receive Quotes</h3>
              <p className="text-gray-600">
                Qualified tradespeople in your area will submit competitive quotes. Compare and choose the best fit.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-[#0F172A] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-[#0F172A] mb-3">3. Get It Done</h3>
              <p className="text-gray-600">
                Hire your chosen tradesperson, track progress, and pay securely through our platform when satisfied.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Services Section */}
      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#0F172A] mb-4">Popular Services</h2>
            <p className="text-xl text-gray-600">Find skilled tradespeople for any home project</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { name: 'Plumbing', color: '#3B82F6', icon: '🔧' },
              { name: 'Electrical', color: '#F59E0B', icon: '⚡' },
              { name: 'Carpentry', color: '#8B4513', icon: '🪚' },
              { name: 'Painting', color: '#EC4899', icon: '🎨' },
              { name: 'Roofing', color: '#6B7280', icon: '🏠' },
              { name: 'Landscaping', color: '#10B981', icon: '🌳' },
              { name: 'Heating & Cooling', color: '#EF4444', icon: '🌡️' },
              { name: 'Flooring', color: '#A855F7', icon: '📐' },
              { name: 'Tiling', color: '#06B6D4', icon: '🔲' },
              { name: 'General Handyman', color: '#F97316', icon: '🛠️' },
            ].map((service) => (
              <div
                key={service.name}
                className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
                  style={{ backgroundColor: service.color + '20' }}
                >
                  {service.icon}
                </div>
                <h3 className="font-semibold text-[#0F172A]">{service.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section id="features" className="py-20 bg-gradient-to-br from-[#0F172A] to-[#1e293b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Powered by AI</h2>
            <p className="text-xl text-gray-300">Smart technology for better matches and faster results</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-[#10B981] rounded-lg flex items-center justify-center mb-6">
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
              <div className="w-16 h-16 bg-[#F59E0B] rounded-lg flex items-center justify-center mb-6">
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
              <div className="w-16 h-16 bg-[#EC4899] rounded-lg flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Predictive Recommendations</h3>
              <p className="text-gray-300">
                Get personalized suggestions for maintenance schedules, seasonal work, and cost-saving opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#10B981] to-[#059669]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/90 mb-10">
            Join thousands of satisfied homeowners and skilled tradespeople on our platform
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/register?role=homeowner"
              className="bg-white text-[#10B981] px-10 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              I'm a Homeowner
            </Link>
            <Link
              href="/register?role=contractor"
              className="bg-[#0F172A] text-white px-10 py-4 rounded-lg font-semibold text-lg hover:bg-[#1e293b] transition-colors shadow-lg"
            >
              I'm a Tradesperson
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Company Info */}
            <div>
              <div className="flex items-center mb-6">
                <Logo className="w-10 h-10" />
                <span className="ml-3 text-xl font-bold">Mintenance</span>
              </div>
              <p className="text-gray-400 mb-4">
                Connecting homeowners with trusted tradespeople across the UK.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-[#10B981] transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-[#10B981] transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-[#10B981] transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.441 16.892c-2.102.144-6.784.144-8.883 0C5.282 16.736 5.017 15.622 5 12c.017-3.629.285-4.736 2.558-4.892 2.099-.144 6.782-.144 8.883 0C18.718 7.264 18.982 8.378 19 12c-.018 3.629-.285 4.736-2.559 4.892zM10 9.658l4.917 2.338L10 14.342V9.658z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* For Homeowners */}
            <div>
              <h3 className="text-lg font-semibold mb-4">For Homeowners</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/register?role=homeowner" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    Post a Job
                  </Link>
                </li>
                <li>
                  <a href="#how-it-works" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#services" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    Browse Services
                  </a>
                </li>
                <li>
                  <Link href="/contractors" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    Find Tradespeople
                  </Link>
                </li>
              </ul>
            </div>

            {/* For Tradespeople */}
            <div>
              <h3 className="text-lg font-semibold mb-4">For Tradespeople</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/register?role=contractor" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    Join as a Tradesperson
                  </Link>
                </li>
                <li>
                  <Link href="/jobs" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    Find Jobs
                  </Link>
                </li>
                <li>
                  <a href="#features" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    Features & Benefits
                  </a>
                </li>
                <li>
                  <Link href="/dashboard" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    Business Dashboard
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    Success Stories
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-[#10B981] transition-colors">
                    Help Centre
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Company Registration Details */}
          <div className="border-t border-gray-800 pt-8">
            <div className="text-center text-gray-400 text-sm space-y-2">
              <p className="font-semibold text-gray-300">MINTENANCE LTD</p>
              <p>Registered Office Address:</p>
              <p>Suite 2 J2 Business Park</p>
              <p>Bridge Hall Lane</p>
              <p>Bury, England, BL9 7NY</p>
              <p className="mt-4">Company No. 16542104</p>
              <p className="mt-6 text-gray-500">
                © {new Date().getFullYear()} Mintenance Ltd. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
