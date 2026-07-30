import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { SchedulingClient } from './components/SchedulingClient';

export const metadata = {
  title: 'Scheduling | Mintenance',
  description: 'Manage your schedule, appointments, and availability',
};

export default async function ContractorSchedulingPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  return <SchedulingClient userId={user.id} />;
}
