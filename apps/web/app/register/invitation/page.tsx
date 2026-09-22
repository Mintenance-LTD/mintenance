import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TenantInvitation } from './TenantInvitation';
export const metadata: Metadata = {
  title: 'Property invitation | Mintenance',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default function InvitationPage() {
  return (
    <Suspense fallback={<p>Loading invitation…</p>}>
      <TenantInvitation />
    </Suspense>
  );
}
