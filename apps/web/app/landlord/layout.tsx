import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';

interface LandlordLayoutProps {
  children: React.ReactNode;
}

export default async function LandlordLayout({
  children,
}: LandlordLayoutProps) {
  const authUser = await getCurrentUserFromCookies();

  if (
    !authUser ||
    (authUser.role !== 'homeowner' && authUser.role !== 'admin')
  ) {
    redirect('/login');
  }

  return <>{children}</>;
}
