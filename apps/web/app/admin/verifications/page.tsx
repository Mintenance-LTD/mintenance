import { serverSupabase } from '@/lib/api/supabaseServer';
import { VerificationClient } from './components/VerificationClient';

export const metadata = {
  title: 'Contractor Verifications | Admin | Mintenance',
};

export default async function AdminVerificationsPage() {
  const supabase = serverSupabase;

  // Fetch initial counts for stats cards
  const { count: totalCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'contractor')
    .is('deleted_at', null);

  const { count: verifiedCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'contractor')
    .eq('admin_verified', true)
    .is('deleted_at', null);

  const { count: rejectedCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'contractor')
    .eq('admin_verified', false)
    .eq('background_check_status', 'rejected')
    .is('deleted_at', null);

  const total = totalCount ?? 0;
  const verified = verifiedCount ?? 0;
  const rejected = rejectedCount ?? 0;
  const pending = total - verified - rejected;

  return (
    <VerificationClient
      initialStats={{
        total,
        pending,
        verified,
        rejected,
      }}
    />
  );
}
