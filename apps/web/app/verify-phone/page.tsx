import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { VerifyPhoneClient } from './components/VerifyPhoneClient';

export default async function VerifyPhonePage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/verify-phone');
  }

  if (user.role !== 'homeowner') {
    redirect('/dashboard');
  }

  // Check if already verified
  const { data: userData } = await serverSupabase
    .from('users')
    .select('phone_verified, phone, first_name, last_name, email')
    .eq('id', user.id)
    .single();

  if (userData?.phone_verified) {
    redirect('/jobs/create');
  }

  return (
    <VerifyPhoneClient 
      userId={user.id}
      currentPhone={userData?.phone || undefined}
      userName={userData?.first_name && userData?.last_name 
        ? `${userData.first_name} ${userData.last_name}`.trim() 
        : undefined}
      userEmail={userData?.email}
    />
  );
}

