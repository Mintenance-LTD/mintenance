import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminCommunicationService } from '@/lib/services/admin/AdminCommunicationService';
import { CommunicationsClient } from './components/CommunicationsClient';

export const metadata = {
  title: 'Admin Communications | Mintenance Admin',
  description: 'Manage announcements and communicate with users',
};

export default async function AdminCommunicationsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  // Fetch all announcements
  const { announcements } = await AdminCommunicationService.getAllAnnouncements({
    publishedOnly: false,
    limit: 50,
  });

  return <CommunicationsClient initialAnnouncements={announcements} adminId={user.id} />;
}

