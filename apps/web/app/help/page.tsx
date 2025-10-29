'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';

export default function HelpCentrePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [
    {
      id: 'getting-started',
      name: 'Getting Started',
      icon: '🚀',
      color: '#10B981',
      articles: [
        { title: 'How to create an account', content: 'Step-by-step guide to registering as a homeowner or tradesperson on Mintenance.' },
        { title: 'Setting up your profile', content: 'Complete your profile to get better matches and more opportunities.' },
        { title: 'Understanding the platform', content: 'Learn about the features and how to navigate Mintenance effectively.' },
        { title: 'Verifying your account', content: 'How to complete the verification process for enhanced security and trust.' },
      ],
    },
    {
      id: 'posting-jobs',
      name: 'Posting Jobs',
      icon: '📝',
      color: '#F59E0B',
      articles: [
        { title: 'How to post a job', content: 'Create a detailed job posting to attract the right tradespeople.' },
        { title: 'Setting a realistic budget', content: 'Guidelines for determining fair pricing for your project.' },
        { title: 'Adding photos and details', content: 'Best practices for providing comprehensive job information.' },
        { title: 'Editing or cancelling a job', content: 'How to modify or cancel a job posting after it\'s been created.' },
      ],
    },
    {
      id: 'finding-contractors',
      name: 'Finding Tradespeople',
      icon: '🔍',
      color: '#8B5CF6',
      articles: [
        { title: 'Using the discovery feature', content: 'How to swipe through and match with local tradespeople.' },
        { title: 'Reading reviews and ratings', content: 'Understanding tradesperson profiles and reputation scores.' },
        { title: 'Checking qualifications', content: 'How to verify certifications and professional credentials.' },
        { title: 'Contacting tradespeople', content: 'Best practices for initial communication and enquiries.' },
      ],
    },
    {
      id: 'bidding-quotes',
      name: 'Bids & Quotes',
      icon: '💷',
      color: '#EC4899',
      articles: [
        { title: 'Receiving and comparing quotes', content: 'How to evaluate multiple bids for your project.' },
        { title: 'Accepting a bid', content: 'Process for hiring a tradesperson and starting your project.' },
        { title: 'Negotiating price', content: 'Tips for professional price discussions with tradespeople.' },
        { title: 'Understanding quote breakdowns', content: 'How to read detailed cost estimates and timelines.' },
      ],
    },
    {
      id: 'payments',
      name: 'Payments & Billing',
      icon: '💳',
      color: '#06B6D4',
      articles: [
        { title: 'How payments work', content: 'Understanding our secure escrow payment system.' },
        { title: 'Payment methods accepted', content: 'Supported payment options and how to add them.' },
        { title: 'Releasing payment', content: 'When and how to approve payment to your tradesperson.' },
        { title: 'Refunds and disputes', content: 'Process for handling payment issues and disagreements.' },
        { title: 'VAT and invoices', content: 'Understanding tax documentation and receipt generation.' },
      ],
    },
    {
      id: 'messaging',
      name: 'Messaging & Communication',
      icon: '💬',
      color: '#EF4444',
      articles: [
        { title: 'Using the messaging system', content: 'How to communicate with tradespeople through our platform.' },
        { title: 'Notification settings', content: 'Customise your alerts for messages, bids, and updates.' },
        { title: 'Sharing files and photos', content: 'How to exchange images and documents securely.' },
        { title: 'Reporting inappropriate behaviour', content: 'How to flag concerning messages or conduct.' },
      ],
    },
    {
      id: 'tradespeople',
      name: 'For Tradespeople',
      icon: '🔨',
      color: '#F97316',
      articles: [
        { title: 'Finding jobs near you', content: 'How to discover local projects that match your skills.' },
        { title: 'Submitting competitive bids', content: 'Tips for creating winning proposals.' },
        { title: 'Building your reputation', content: 'Strategies for earning positive reviews and growing your business.' },
        { title: 'Managing your calendar', content: 'How to update availability and schedule projects.' },
        { title: 'Receiving payments', content: 'Understanding the payout process and timeline.' },
      ],
    },
    {
      id: 'safety',
      name: 'Safety & Trust',
      icon: '🛡️',
      color: '#10B981',
      articles: [
        { title: 'Our verification process', content: 'How we verify tradespeople and ensure platform safety.' },
        { title: 'Reporting concerns', content: 'How to report suspicious activity or safety issues.' },
        { title: 'Insurance and guarantees', content: 'Understanding coverage and protection for your projects.' },
        { title: 'Staying safe online', content: 'Best practices for protecting your personal information.' },
      ],
    },
    {
      id: 'account',
      name: 'Account Management',
      icon: '⚙️',
      color: '#6B7280',
      articles: [
        { title: 'Updating account details', content: 'How to change your email, password, and personal information.' },
        { title: 'Privacy settings', content: 'Control who can see your information and activity.' },
        { title: 'Notification preferences', content: 'Customise your email and push notification settings.' },
        { title: 'Deactivating your account', content: 'How to temporarily disable or permanently delete your account.' },
      ],
    },
  ];

  const filteredCategories = categories.map(category => ({
    ...category,
    articles: category.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.articles.length > 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Logo />
              <span className="ml-3 text-xl font-bold text-primary">Mintenance</span>
            </Link>
            <Link
              href="/"
              className="text-gray-700 hover:text-secondary transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with Search */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary to-primary-light">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            How Can We Help?
          </h1>
          <p className="text-xl text-gray-300 mb-10">
            Search our knowledge base or browse categories to find answers
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help articles..."
              className="w-full px-6 py-4 pl-14 pr-4 rounded-xl text-lg border-2 border-transparent focus:border-secondary focus:outline-none"
            />
            <svg
              className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-secondary mb-2">150+</div>
              <div className="text-gray-600">Help Articles</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-secondary mb-2">9</div>
              <div className="text-gray-600">Categories</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-secondary mb-2">24/7</div>
              <div className="text-gray-600">Support Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-primary mb-12 text-center">Browse by Category</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-secondary transition-all cursor-pointer"
                onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
              >
                <div className="flex items-center mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mr-4"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-primary">{category.name}</h3>
                    <p className="text-sm text-gray-600">{category.articles.length} articles</p>
                  </div>
                  <svg
                    className={`w-6 h-6 text-gray-400 transition-transform ${
                      activeCategory === category.id ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded Articles List */}
                {activeCategory === category.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    {category.articles.map((article, index) => (
                      <div key={index} className="group">
                        <h4 className="font-medium text-primary group-hover:text-secondary transition-colors mb-1">
                          {article.title}
                        </h4>
                        <p className="text-sm text-gray-600">{article.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No results found</h3>
              <p className="text-gray-600">Try a different search term or browse all categories</p>
            </div>
          )}
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-primary mb-12 text-center">Most Popular Articles</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'How to create an account', category: 'Getting Started', views: '12.5k' },
              { title: 'How to post a job', category: 'Posting Jobs', views: '10.2k' },
              { title: 'How payments work', category: 'Payments & Billing', views: '8.7k' },
              { title: 'Receiving and comparing quotes', category: 'Bids & Quotes', views: '7.9k' },
              { title: 'Finding jobs near you', category: 'For Tradespeople', views: '7.3k' },
              { title: 'Our verification process', category: 'Safety & Trust', views: '6.8k' },
            ].map((article, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-primary flex-1">{article.title}</h3>
                  <span className="text-sm text-gray-500 ml-4">{article.views} views</span>
                </div>
                <p className="text-sm text-secondary font-medium">{article.category}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-secondary to-secondary-dark">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Still Need Help?
          </h2>
          <p className="text-xl text-white/90 mb-10">
            Can't find what you're looking for? Our support team is here to assist you.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/contact"
              className="bg-white text-secondary px-10 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg inline-flex items-center justify-center"
            >
              Contact Support
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <button className="bg-primary text-white px-10 py-4 rounded-lg font-semibold text-lg hover:bg-primary-light transition-colors shadow-lg inline-flex items-center justify-center">
              Start Live Chat
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <Logo />
            <span className="ml-3 text-xl font-bold">Mintenance</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
            <Link href="/" className="text-gray-400 hover:text-secondary transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-gray-400 hover:text-secondary transition-colors">
              About Us
            </Link>
            <Link href="/contact" className="text-gray-400 hover:text-secondary transition-colors">
              Contact
            </Link>
            <Link href="/privacy" className="text-gray-400 hover:text-secondary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-secondary transition-colors">
              Terms of Service
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
