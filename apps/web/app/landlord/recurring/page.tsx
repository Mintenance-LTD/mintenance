import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { RecurringTasksClient } from './RecurringTasksClient';
import { MintEditorialRecurringTasks } from './MintEditorialRecurringTasks';

export const metadata: Metadata = {
  title: 'Recurring Tasks | Mintenance',
  description: 'Schedule recurring maintenance tasks across your properties.',
};

export default async function RecurringTasksPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/landlord/recurring');
  }
  if (user.role !== 'homeowner' && user.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch properties
  const { data: properties } = await serverSupabase
    .from('properties')
    .select('id, property_name, address')
    .eq('owner_id', user.id)
    .order('property_name');

  // Fetch recurring schedules
  const { data: schedules } = await serverSupabase
    .from('recurring_schedules')
    .select('*')
    .eq('owner_id', user.id)
    .order('next_due_date', { ascending: true });

  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  if (isMintEditorial) {
    return (
      <MintEditorialRecurringTasks
        properties={properties || []}
        schedules={schedules || []}
      />
    );
  }

  return (
    <RecurringTasksClient
      properties={properties || []}
      schedules={schedules || []}
    />
  );
}
