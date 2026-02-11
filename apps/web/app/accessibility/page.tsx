import Link from 'next/link';
import Logo from '../components/Logo';

export const metadata = {
  title: 'Accessibility Statement | Mintenance',
  description: 'Accessibility statement for Mintenance - Our commitment to digital accessibility',
};

export default function AccessibilityStatementPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center space-x-2">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Accessibility Statement</h1>
          <p className="text-gray-500 mb-8">Last updated: February 2026</p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Commitment</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Mintenance Ltd is committed to ensuring digital accessibility for people with
              disabilities. We are continually improving the user experience for everyone and
              applying the relevant accessibility standards.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Conformance Status</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at
              Level AA. These guidelines explain how to make web content more accessible for
              people with disabilities.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We are working towards full conformance. The following measures have been taken:
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-3 space-y-2">
              <li>All interactive elements have visible focus indicators</li>
              <li>Form inputs include appropriate ARIA labels and error descriptions</li>
              <li>Colour contrast ratios meet WCAG AA minimum requirements</li>
              <li>Modal dialogs implement focus trapping to prevent loss of keyboard context</li>
              <li>Page navigation is announced to screen readers via ARIA live regions</li>
              <li>Images include descriptive alternative text</li>
              <li>The application is operable via keyboard alone</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">AI-Generated Content</h2>
            <p className="text-gray-700 leading-relaxed">
              Our Building Surveyor AI feature produces automated assessments. All AI-generated
              content is clearly labelled as such and includes a disclaimer. AI assessment
              results are presented in structured HTML that is accessible to screen readers,
              with severity levels communicated through both colour and text.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Known Limitations</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Some third-party embedded content (e.g. Stripe payment forms) may have
                limited accessibility that is outside our direct control</li>
              <li>Real-time chat features may not fully announce new messages to all
                screen reader technologies</li>
              <li>Map-based features rely on visual interaction; we are working on alternative
                text-based location selection</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Feedback</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We welcome your feedback on the accessibility of Mintenance. Please let us know
              if you encounter accessibility barriers:
            </p>
            <div className="text-gray-700 space-y-2">
              <p><strong>Email:</strong> accessibility@mintenance.app</p>
              <p><strong>Post:</strong> Accessibility Team, Mintenance Ltd, Suite 2 J2 Business Park,
                Bridge Hall Lane, Bury, England, BL9 7NY</p>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4">
              We aim to respond to accessibility feedback within 5 business days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Enforcement</h2>
            <p className="text-gray-700 leading-relaxed">
              If you are not satisfied with our response, you can contact the Equality and
              Human Rights Commission (EHRC) at{' '}
              <a
                href="https://www.equalityadvisoryservice.com/"
                className="text-teal-600 hover:text-teal-700 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded"
                target="_blank"
                rel="noopener noreferrer"
              >
                equalityadvisoryservice.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link
            href="/"
            className="inline-flex items-center text-teal-600 hover:text-teal-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </main>

      <footer className="bg-slate-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} MINTENANCE LTD. All rights reserved.</p>
          <p className="mt-2 text-gray-400">Company No. 16542104 | Registered in England and Wales</p>
        </div>
      </footer>
    </div>
  );
}
