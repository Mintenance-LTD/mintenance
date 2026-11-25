import { AdminSupportInbox } from '@/components/support/AdminSupportInbox';
import { isValidUUID } from '@/lib/validation/uuid';

export const metadata = { title: 'Support inbox | Mintenance admin' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const params = await searchParams;
  const ref = params.case;
  return (
    <AdminSupportInbox
      initialCaseId={
        typeof ref === 'string' && isValidUUID(ref) ? ref : undefined
      }
    />
  );
}
