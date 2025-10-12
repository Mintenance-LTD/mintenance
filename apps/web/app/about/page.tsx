import Link from 'next/link';
import Logo from '../components/Logo';

export const metadata = {
  title: 'About Us | Mintenance',
  description: 'Learn about Mintenance - connecting homeowners with trusted tradespeople across the UK through innovative technology.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Logo className="w-10 h-10" />
              <span className="ml-3 text-xl font-bold text-[#0F172A]">Mintenance</span>
            </Link>
            <Link
              href="/"
              className="text-gray-700 hover:text-[#10B981] transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0F172A] to-[#1e293b]">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            About Mintenance
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            We're revolutionising the way homeowners connect with skilled tradespeople across the United Kingdom,
            making home maintenance simple, transparent, and reliable.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-[#0F172A] mb-8">Our Story</h2>
          <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
            <p>
              Founded in 2024, Mintenance was born from a simple observation: finding reliable tradespeople shouldn't be difficult,
              time-consuming, or stressful. Too many homeowners struggled to find trustworthy contractors, whilst skilled tradespeople
              found it challenging to connect with clients who valued their expertise.
            </p>
            <p>
              We set out to solve this problem by creating a platform that benefits both sides of the marketplace. Using cutting-edge
              technology including artificial intelligence and machine learning, we match homeowners with the right tradespeople based
              on skills, location, availability, and budget.
            </p>
            <p>
              Today, Mintenance serves thousands of homeowners and tradespeople across the UK, facilitating tens of thousands of successful
              home maintenance and improvement projects. We're proud to be the UK's first offline-first marketplace platform, ensuring our
              service works even in areas with poor connectivity.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Mission */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
              <div className="w-16 h-16 bg-[#10B981] rounded-lg flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-[#0F172A] mb-4">Our Mission</h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                To empower homeowners and tradespeople through technology, creating a transparent, efficient, and trustworthy marketplace
                that makes home maintenance accessible to everyone whilst supporting skilled professionals in growing their businesses.
              </p>
            </div>

            {/* Vision */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
              <div className="w-16 h-16 bg-[#F59E0B] rounded-lg flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-[#0F172A] mb-4">Our Vision</h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                To become the UK's most trusted home services platform, where every homeowner can find the perfect tradesperson for their
                needs, and every skilled professional can build a thriving business doing work they love.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-[#0F172A] mb-12 text-center">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-3">Trust & Safety</h3>
              <p className="text-gray-600">
                We verify all tradespeople, secure all payments, and ensure every job is protected by our guarantee.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-[#F59E0B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-3">Transparency</h3>
              <p className="text-gray-600">
                Clear pricing, honest reviews, and complete visibility throughout every stage of your project.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-[#8B5CF6]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-3">Quality</h3>
              <p className="text-gray-600">
                We maintain the highest standards for every tradesperson on our platform and every job completed.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-[#EC4899]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#EC4899]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-3">Innovation</h3>
              <p className="text-gray-600">
                Leveraging AI and cutting-edge technology to continuously improve the experience for everyone.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-[#06B6D4]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#06B6D4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-3">Community</h3>
              <p className="text-gray-600">
                Building lasting relationships between homeowners and tradespeople based on mutual respect and success.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-[#EF4444]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-3">Reliability</h3>
              <p className="text-gray-600">
                Consistent, dependable service that works when you need it, even offline in areas with poor connectivity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* By The Numbers */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0F172A] to-[#1e293b]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">Mintenance By The Numbers</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold text-[#10B981] mb-2">10,000+</div>
              <div className="text-xl text-gray-300">Verified Tradespeople</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-[#10B981] mb-2">50,000+</div>
              <div className="text-xl text-gray-300">Jobs Completed</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-[#10B981] mb-2">4.8★</div>
              <div className="text-xl text-gray-300">Average Rating</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-[#10B981] mb-2">98%</div>
              <div className="text-xl text-gray-300">Customer Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology & Innovation */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-[#0F172A] mb-8 text-center">Technology & Innovation</h2>
          <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
            <p>
              At Mintenance, we believe technology should make life easier, not more complicated. That's why we've invested heavily
              in building a platform that's both powerful and intuitive.
            </p>
            <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
              <h3 className="text-2xl font-semibold text-[#0F172A] mb-4">Our Technical Advantages</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-[#10B981] mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>AI-Powered Matching:</strong> Our machine learning algorithms analyse job requirements and tradesperson skills to create perfect matches.</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-[#10B981] mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Offline-First Architecture:</strong> The UK's first marketplace platform that works seamlessly even without internet connectivity.</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-[#10B981] mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Secure Payment Processing:</strong> Bank-level encryption and escrow protection for every transaction.</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-[#10B981] mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Real-Time Communication:</strong> Instant messaging and notifications keep everyone connected throughout the project.</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-[#10B981] mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Smart Job Analysis:</strong> Our AI automatically categorises jobs, suggests budgets, and estimates timelines.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Company Information */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-[#0F172A] mb-8 text-center">Company Information</h2>
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-[#10B981] mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div>
                  <p className="font-semibold text-[#0F172A]">Company Name</p>
                  <p>MINTENANCE LTD</p>
                </div>
              </div>

              <div className="flex items-start">
                <svg className="w-6 h-6 text-[#10B981] mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-[#0F172A]">Registered Office Address</p>
                  <p>Suite 2 J2 Business Park<br />Bridge Hall Lane<br />Bury, England<br />BL9 7NY</p>
                </div>
              </div>

              <div className="flex items-start">
                <svg className="w-6 h-6 text-[#10B981] mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="font-semibold text-[#0F172A]">Company Number</p>
                  <p>16542104</p>
                </div>
              </div>

              <div className="flex items-start">
                <svg className="w-6 h-6 text-[#10B981] mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                <div>
                  <p className="font-semibold text-[#0F172A]">Jurisdiction</p>
                  <p>England and Wales</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#10B981] to-[#059669]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Join Our Growing Community
          </h2>
          <p className="text-xl text-white/90 mb-10">
            Whether you're a homeowner looking for reliable tradespeople or a skilled professional seeking new opportunities,
            Mintenance is here to help you succeed.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/register?role=homeowner"
              className="bg-white text-[#10B981] px-10 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Get Started as a Homeowner
            </Link>
            <Link
              href="/register?role=contractor"
              className="bg-[#0F172A] text-white px-10 py-4 rounded-lg font-semibold text-lg hover:bg-[#1e293b] transition-colors shadow-lg"
            >
              Join as a Tradesperson
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <Logo className="w-10 h-10" />
            <span className="ml-3 text-xl font-bold">Mintenance</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
            <Link href="/" className="text-gray-400 hover:text-[#10B981] transition-colors">
              Home
            </Link>
            <Link href="/privacy" className="text-gray-400 hover:text-[#10B981] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-[#10B981] transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-gray-400 hover:text-[#10B981] transition-colors">
              Contact
            </Link>
          </div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Mintenance Ltd. All rights reserved. Company No. 16542104
          </p>
        </div>
      </footer>
    </div>
  );
}
