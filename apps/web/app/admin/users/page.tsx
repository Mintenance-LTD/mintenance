import { serverSupabase } from '@/lib/api/supabaseServer';
import { UserManagementClient } from './components/UserManagementClient';

export const metadata = {
  title: 'User Management | Admin | Mintenance',
};

export default async function AdminUsersPage() {
  const supabase = serverSupabase;

  const PAGE_SIZE = 20;

  const { data: users, count } = await supabase
    .from('profiles')
    .select('id,email,first_name,last_name,role,company_name,license_number,admin_verified,created_at,updated_at', { count: 'exact' })
    .is('deleted_at', null)
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
    verificationStatus: u.role !== 'contractor' ? ('not_applicable' as const) : u.admin_verified
      ? ('verified' as const)
      : u.company_name && u.license_number ? ('pending' as const) : ('not_submitted' as const),
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
