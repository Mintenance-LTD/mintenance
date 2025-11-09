'use client';
import React from 'react';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';

interface DashboardSidebarProps {
  currentPath?: string;
  userName?: string;
  userEmail?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function DashboardSidebar({ currentPath = '/dashboard', userName, userEmail, mobileOpen, onMobileClose }: DashboardSidebarProps) {
  const userInfo = userName && userEmail ? {
    name: userName,
    email: userEmail,
  } : undefined;

  return (
    <UnifiedSidebar 
      userRole="homeowner"
      userInfo={userInfo}
    />
  );
}

