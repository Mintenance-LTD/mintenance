import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Trust & Safety | Mintenance',
  description: 'Learn how Mintenance ensures a safe and secure platform for homeowners and contractors.',
};

export default function SafetyPage() {
  return (
    <ErrorBoundary componentName="SafetyPage">
      <div>
        <LandingNavigation />
        <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <Shield className="w-16 h-16 text-teal-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Trust & Safety</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your safety and security are our top priorities. Learn how we protect you on the platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <CheckCircle className="w-12 h-12 text-teal-600 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Verified Contractors</h2>
            <p className="text-gray-600 mb-4">
              All contractors on our platform undergo a comprehensive verification process including:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">•</span>
                <span>Identity verification</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">•</span>
                <span>Background checks</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">•</span>
                <span>Insurance verification</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">•</span>
                <span>Skills assessment</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-8">
            <Shield className="w-12 h-12 text-teal-600 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Secure Payments</h2>
            <p className="text-gray-600 mb-4">
              We use industry-leading security measures to protect your financial information:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">•</span>
                <span>Encrypted payment processing</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">•</span>
                <span>Escrow protection for payments</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">•</span>
                <span>PCI DSS compliant</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">•</span>
                <span>Secure data storage</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <Users className="w-12 h-12 text-teal-600 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Community Guidelines</h2>
          <p className="text-gray-600 mb-6">
            We maintain a safe and respectful community through clear guidelines and active moderation.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">For Homeowners</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Provide accurate job descriptions</li>
                <li>• Communicate clearly and respectfully</li>
                <li>• Pay contractors promptly</li>
                <li>• Leave honest reviews</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">For Contractors</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Complete work as agreed</li>
                <li>• Maintain professional conduct</li>
                <li>• Respond to messages promptly</li>
                <li>• Follow all safety regulations</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8">
          <AlertTriangle className="w-12 h-12 text-amber-600 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Report a Concern</h2>
          <p className="text-gray-600 mb-4">
            If you encounter any safety issues or violations of our community guidelines, please report them immediately.
          </p>
          <Link
            href="/contact?subject=Safety+Concern"
            className="inline-block px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Report an Issue
          </Link>
        </div>
      </div>
      <Footer2025 />
      </div>
    </ErrorBoundary>
  );
}
