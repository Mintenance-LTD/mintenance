/**
 * /contractor/onboarding/credentials — submit Gas Safe / NICEIC /
 * TrustMark registration numbers for verification.
 *
 * R4 of docs/RETENTION_ROADMAP_2026.md.
 */

import type { Metadata } from 'next';
import { CredentialSubmitForm } from './components/CredentialSubmitForm';

export const metadata: Metadata = {
  title: 'Verify your trade credentials | Mintenance',
};

export default function CredentialOnboardingPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Verify your trade credentials
        </h1>
        <p className="text-sm text-gray-500 mt-2 max-w-2xl">
          Add your Gas Safe / NICEIC / TrustMark registration numbers so
          homeowners can see the green &ldquo;Verified&rdquo; badge on your
          profile. Each submission is checked against the upstream register
          or, if the register API isn&rsquo;t available, reviewed by our
          team within 2 business days.
        </p>
      </header>
      <CredentialSubmitForm />
    </div>
  );
}
