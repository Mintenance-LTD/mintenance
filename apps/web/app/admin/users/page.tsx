import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { UserManagementClient } from './components/UserManagementClient';

export const metadata = {
  title: 'User Management | Mintenance Admin',
  description: 'Manage platform users and contractor verification',
};

export default async function UserManagementPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch initial user list
  const searchParams = new URLSearchParams();
  searchParams.append('page', '1');
  searchParams.append('limit', '20');

  const { data: usersData, error, count } = await serverSupabase
    .from('users')
    .select('id, email, first_name, last_name, role, company_name, admin_verified, created_at, updated_at', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(0, 19);

  if (error) {
    console.error('Error fetching initial users:', error);
  }

  // Process users and add verification status
  const users = await Promise.all(
    (usersData || []).map(async (userData) => {
      if (userData.role === 'contractor') {
        const { data: contractorData } = await serverSupabase
          .from('users')
          .select('company_name, license_number, business_address')
          .eq('id', userData.id)
          .single();

        return {
          ...userData,
          hasVerificationData: Boolean(
            contractorData?.company_name && contractorData?.license_number && contractorData?.business_address
          ),
          verificationStatus: userData.admin_verified
            ? ('verified' as const)
            : contractorData?.company_name && contractorData?.license_number
              ? ('pending' as const)
              : ('not_submitted' as const),
        };
      }
      return {
        ...userData,
        verificationStatus: 'not_applicable' as const,
      };
    })
  );

  const pagination = {
    page: 1,
    limit: 20,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / 20),
  };

  return <UserManagementClient initialUsers={users} initialPagination={pagination} />;
}

