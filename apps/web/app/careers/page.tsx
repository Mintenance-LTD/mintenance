import { Metadata } from 'next';
import Link from 'next/link';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Careers | Mintenance',
  description: 'Join the Mintenance team and help us revolutionise home maintenance services.',
};

export default function CareersPage() {
  return (
    <ErrorBoundary componentName="CareersPage">
      <div>
        <LandingNavigation />
        <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Join Our Team</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We&apos;re building the future of home maintenance. Come help us connect homeowners with trusted tradespeople across the UK.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Open Positions</h2>
          <div className="space-y-6">
            <div className="border-l-4 border-teal-600 pl-6 py-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Senior Full-Stack Developer</h3>
              <p className="text-gray-600 mb-4">
                We&apos;re looking for an experienced developer to help build and scale our platform using Next.js, React, and TypeScript.
              </p>
              <Link
                href="/contact?subject=Senior+Full-Stack+Developer"
                className="inline-block px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Apply Now
              </Link>
            </div>

            <div className="border-l-4 border-teal-600 pl-6 py-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Product Designer</h3>
              <p className="text-gray-600 mb-4">
                Help us create beautiful, intuitive experiences for homeowners and contractors.
              </p>
              <Link
                href="/contact?subject=Product+Designer"
                className="inline-block px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Why Work With Us?</h2>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start">
              <span className="text-teal-600 mr-3">✓</span>
              <span>Competitive salary and equity package</span>
            </li>
            <li className="flex items-start">
              <span className="text-teal-600 mr-3">✓</span>
              <span>Flexible working arrangements</span>
            </li>
            <li className="flex items-start">
              <span className="text-teal-600 mr-3">✓</span>
              <span>Health and wellness benefits</span>
            </li>
            <li className="flex items-start">
              <span className="text-teal-600 mr-3">✓</span>
              <span>Opportunity to make a real impact</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            Don&apos;t see a role that fits? We&apos;re always looking for talented people.
          </p>
          <Link
            href="/contact?subject=General+Inquiry"
            className="inline-block px-6 py-2 border-2 border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
          >
            Get in Touch
          </Link>
        </div>
        </div>
        <Footer2025 />
        </div>
      </div>
    </ErrorBoundary>
  );
}
