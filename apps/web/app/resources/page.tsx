import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { RESOURCE_ARTICLES, RESOURCE_CATEGORIES } from './resources-data';
import { ResourcesClient } from './ResourcesClient';

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex p-4 rounded-2xl bg-teal-50 mb-6">
            <BookOpen className="w-12 h-12 text-teal-600" aria-hidden />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Resources for Contractors
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Guides, tips, and best practices to grow your contracting business. Browse by category below and sign in to read full articles.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register?type=contractor"
              className="inline-flex items-center justify-center rounded-lg bg-[#1F2937] text-white px-6 py-3 font-semibold hover:bg-[#374151] transition-colors"
            >
              Create contractor account
            </Link>
            <Link
              href="/login?redirect=/contractor/resources"
              className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 text-gray-700 px-6 py-3 font-semibold hover:bg-gray-50 transition-colors"
            >
              Log in to access resources
            </Link>
          </div>
        </div>

        {/* Article list with filter/search */}
        <ResourcesClient
          articles={RESOURCE_ARTICLES}
          categories={RESOURCE_CATEGORIES}
          loginRedirect="/login?redirect=/contractor/resources"
        />

        {/* CTA */}
        <section className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Already have an account?{' '}
            <Link
              href="/login?redirect=/contractor/resources"
              className="text-[#3B82F6] font-medium hover:underline"
            >
              Log in to read all resources
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
