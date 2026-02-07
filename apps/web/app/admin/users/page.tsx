import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { UserManagementClient } from './components/UserManagementClient';

export const metadata = {
  title: 'User Management | Admin | Mintenance',
};

export default async function AdminUsersPage() {
  const supabase = createServerComponentClient({ cookies });

  const PAGE_SIZE = 20;

  const { data: users, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, PAGE_SIZE - 1);

  const mappedUsers = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? '',
    first_name: u.first_name ?? null,
    last_name: u.last_name ?? null,
    role: u.role ?? 'homeowner',
    company_name: u.company_name ?? null,
    admin_verified: u.admin_verified ?? false,
    created_at: u.created_at,
    updated_at: u.updated_at,
    verificationStatus: u.admin_verified
      ? ('verified' as const)
      : ('pending' as const),
  }));

  const pagination = {
    page: 1,
    limit: PAGE_SIZE,
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  };

  return (
    <UserManagementClient
      initialUsers={mappedUsers}
      initialPagination={pagination}
    />
  );
}
