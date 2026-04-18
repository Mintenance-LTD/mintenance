/**
 * /admin/verifications/credentials — admin queue for pending Gas Safe /
 * NICEIC / TrustMark registration verifications.
 * R4 of docs/RETENTION_ROADMAP_2026.md.
 */

import type { Metadata } from 'next';
import { CredentialVerificationQueue } from './components/CredentialVerificationQueue';

export const metadata: Metadata = {
  title: 'Credential verifications | Admin | Mintenance',
};

export default function AdminCredentialVerificationsPage() {
  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          Credential verifications
        </h1>
        <p className="text-sm text-gray-500 mt-1 max-w-3xl">
          Manual-review fallback while Gas Safe / NICEIC / TrustMark API
          contracts are in procurement. Approving a row flips the contractor
          badge to &ldquo;Verified&rdquo; and notifies the contractor.
        </p>
      </header>
      <CredentialVerificationQueue />
    </div>
  );
}
