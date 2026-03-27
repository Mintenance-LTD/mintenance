import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserDetailClient } from './UserDetailClient';

export const metadata = {
  title: 'User Detail | Admin | Mintenance',
  description: 'View detailed user information and manage account',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  const { id } = await params;

  return <UserDetailClient userId={id} />;
}
