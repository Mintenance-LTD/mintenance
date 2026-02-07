import { Metadata } from 'next';
import Link from 'next/link';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Press | Mintenance',
  description: 'Press resources and media kit for Mintenance.',
};

export default function PressPage() {
  return (
    <ErrorBoundary componentName="PressPage">
      <div>
        <LandingNavigation />
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Press &amp; Media</h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Resources for journalists, bloggers, and media professionals.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Media Kit</h2>
                <p className="text-gray-600 mb-6">
                  Download our logo, brand guidelines, and high-resolution images for your articles.
                </p>
                <Link
                  href="/contact?subject=Media+Kit+Request"
                  className="inline-block px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Request Media Kit
                </Link>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Press Inquiries</h2>
                <p className="text-gray-600 mb-6">
                  Have a question or want to schedule an interview? Get in touch with our press team.
                </p>
                <Link
                  href="/contact?subject=Press+Enquiry"
                  className="inline-block px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Contact Press Team
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recent News</h2>
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Mintenance Launches AI-Powered Job Matching</h3>
                  <p className="text-gray-600 mb-2">2025</p>
                  <p className="text-gray-600">
                    Mintenance introduces advanced AI technology to match homeowners with the perfect contractors for their projects.
                  </p>
                </div>
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Platform Launch</h3>
                  <p className="text-gray-600 mb-2">2025</p>
                  <p className="text-gray-600">
                    Mintenance officially launches, connecting homeowners with verified contractors across the UK.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}
