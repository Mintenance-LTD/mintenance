import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

export const metadata = {
  title: 'Accessibility Statement | Mintenance',
  description:
    'Accessibility statement for Mintenance - Our commitment to digital accessibility',
};

export default function AccessibilityStatementPage() {
  return (
    <LegalPageLayout
      title='Accessibility Statement'
      lastUpdated='February 2026'
    >
      <section className='mb-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-4'>
          Our Commitment
        </h2>
        <p className='text-gray-700 leading-relaxed mb-4'>
          Mintenance Ltd is committed to ensuring digital accessibility for
          people with disabilities. We are continually improving the user
          experience for everyone and applying the relevant accessibility
          standards.
        </p>
      </section>

      <section className='mb-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-4'>
          Conformance Status
        </h2>
        <p className='text-gray-700 leading-relaxed mb-4'>
          We aim to conform to the Web Content Accessibility Guidelines (WCAG)
          2.1 at Level AA. These guidelines explain how to make web content more
          accessible for people with disabilities.
        </p>
        <p className='text-gray-700 leading-relaxed'>
          We are working towards full conformance. The following measures have
          been taken:
        </p>
        <ul className='list-disc list-inside text-gray-700 mt-3 space-y-2'>
          <li>All interactive elements have visible focus indicators</li>
          <li>
            Form inputs include appropriate ARIA labels and error descriptions
          </li>
          <li>Colour contrast ratios meet WCAG AA minimum requirements</li>
          <li>
            Modal dialogs implement focus trapping to prevent loss of keyboard
            context
          </li>
          <li>
            Page navigation is announced to screen readers via ARIA live regions
          </li>
          <li>Images include descriptive alternative text</li>
          <li>The application is operable via keyboard alone</li>
        </ul>
      </section>

      <section className='mb-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-4'>
          AI-Generated Content
        </h2>
        <p className='text-gray-700 leading-relaxed'>
          Our Building Surveyor AI feature produces automated assessments. All
          AI-generated content is clearly labelled as such and includes a
          disclaimer. AI assessment results are presented in structured HTML
          that is accessible to screen readers, with severity levels
          communicated through both colour and text.
        </p>
      </section>

      <section className='mb-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-4'>
          Known Limitations
        </h2>
        <ul className='list-disc list-inside text-gray-700 space-y-2'>
          <li>
            Some third-party embedded content (e.g. Stripe payment forms) may
            have limited accessibility that is outside our direct control
          </li>
          <li>
            Real-time chat features may not fully announce new messages to all
            screen reader technologies
          </li>
          <li>
            Map-based features rely on visual interaction; we are working on
            alternative text-based location selection
          </li>
        </ul>
      </section>

      <section className='mb-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-4'>Feedback</h2>
        <p className='text-gray-700 leading-relaxed mb-4'>
          We welcome your feedback on the accessibility of Mintenance. Please
          let us know if you encounter accessibility barriers:
        </p>
        <div className='text-gray-700 space-y-2'>
          <p>
            <strong>Email:</strong> accessibility@mintenance.app
          </p>
          <p>
            <strong>Post:</strong> Accessibility Team, Mintenance Ltd, Suite 2
            J2 Business Park, Bridge Hall Lane, Bury, England, BL9 7NY
          </p>
        </div>
        <p className='text-gray-700 leading-relaxed mt-4'>
          We aim to respond to accessibility feedback within 5 business days.
        </p>
      </section>

      <section className='mb-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-4'>Enforcement</h2>
        <p className='text-gray-700 leading-relaxed'>
          If you are not satisfied with our response, you can contact the
          Equality and Human Rights Commission (EHRC) at{' '}
          <a
            href='https://www.equalityadvisoryservice.com/'
            className='text-teal-600 hover:text-teal-700 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded'
            target='_blank'
            rel='noopener noreferrer'
          >
            equalityadvisoryservice.com
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
