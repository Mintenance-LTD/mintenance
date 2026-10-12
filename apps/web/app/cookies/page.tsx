import { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Cookie Policy | Mintenance',
  description:
    'Learn about how Mintenance uses cookies and similar technologies.',
};

export default function CookiesPage() {
  return (
    <LegalPageLayout title='Cookie Policy' lastUpdated='16 December 2025'>
      <section className='mb-8'>
        <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
          What Are Cookies?
        </h2>
        <p className='text-gray-600 mb-4'>
          Cookies are small text files that are placed on your device when you
          visit our website. They help us provide you with a better experience
          by remembering your preferences and understanding how you use our
          site.
        </p>
      </section>

      <section className='mb-8'>
        <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
          How We Use Cookies
        </h2>
        <p className='text-gray-600 mb-4'>
          We use cookies for the following purposes:
        </p>
        <ul className='list-disc pl-6 space-y-2 text-gray-600 mb-4'>
          <li>
            <strong>Essential Cookies:</strong> Required for the website to
            function properly, including authentication and security features.
          </li>
          <li>
            <strong>Analytics Cookies:</strong> Help us understand how visitors
            interact with our website to improve performance.
          </li>
          <li>
            <strong>Preference Cookies:</strong> Remember your settings and
            preferences for a personalised experience.
          </li>
          <li>
            <strong>Marketing Cookies:</strong> Used to deliver relevant
            advertisements and track campaign effectiveness.
          </li>
        </ul>
      </section>

      <section className='mb-8'>
        <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
          Managing Cookies
        </h2>
        <p className='text-gray-600 mb-4'>
          You can control and manage cookies in your browser settings. However,
          disabling certain cookies may affect the functionality of our website.
        </p>
        <p className='text-gray-600'>Most browsers allow you to:</p>
        <ul className='list-disc pl-6 space-y-2 text-gray-600 mb-4'>
          <li>See what cookies you have and delete them individually</li>
          <li>Block third-party cookies</li>
          <li>Block cookies from specific sites</li>
          <li>Block all cookies</li>
          <li>Delete all cookies when you close your browser</li>
        </ul>
      </section>

      <section className='mb-8'>
        <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
          Third-Party Cookies
        </h2>
        <p className='text-gray-600 mb-4'>
          We may use third-party services that set cookies on your device. These
          include:
        </p>
        <ul className='list-disc pl-6 space-y-2 text-gray-600 mb-4'>
          <li>Google Analytics for website analytics</li>
          <li>Stripe for payment processing</li>
          <li>Social media platforms for sharing features</li>
        </ul>
      </section>

      <section className='mb-8'>
        <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
          Updates to This Policy
        </h2>
        <p className='text-gray-600 mb-4'>
          We may update this Cookie Policy from time to time. We will notify you
          of any changes by posting the new policy on this page and updating the
          &quot;Last updated&quot; date.
        </p>
      </section>

      <section>
        <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
          Contact Us
        </h2>
        <p className='text-gray-600 mb-4'>
          If you have any questions about our use of cookies, please{' '}
          <Link
            href='/contact'
            className='text-[#2f6f5f] hover:text-teal-700 underline'
          >
            contact us
          </Link>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
