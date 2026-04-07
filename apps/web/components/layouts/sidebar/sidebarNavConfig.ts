'use client';

import { useMemo } from 'react';
import {
  Home,
  Calendar,
  Briefcase,
  MessageSquare,
  User,
  Settings,
  Bell,
  Building2,
  Users,
  TrendingUp,
  PoundSterling,
  Video,
  FileText,
  Star,
  Receipt,
  CreditCard,
  Shield,
  Sparkles,
  Heart,
  Compass,
  Pencil,
  Package,
  ClipboardCheck,
  Link2,
  RefreshCw,
  Contact,
  FolderOpen,
  Megaphone,
  BarChart3,
} from 'lucide-react';
import type { NavItem, NavSection } from './SidebarNavItems';

export function useNavSections(
  userRole: 'homeowner' | 'contractor' | 'admin'
): NavSection[] {
  const homeownerSections: NavSection[] = useMemo(
    () => [
      {
        name: 'MAIN',
        items: [
          {
            label: 'Dashboard',
            href: '/dashboard',
            icon: Home,
            shortcut: 'g d',
          },
          {
            label: 'Discover',
            href: '/discover',
            icon: Compass,
            shortcut: 'g x',
          },
        ],
      },
      {
        name: 'WORK',
        items: [
          {
            label: 'Jobs',
            href: '/jobs',
            icon: Briefcase,
            shortcut: 'g j',
            children: [
              { label: 'All Jobs', href: '/jobs', icon: Briefcase },
              { label: 'Active', href: '/jobs?status=active', icon: Briefcase },
              {
                label: 'Completed',
                href: '/jobs?status=completed',
                icon: Briefcase,
              },
            ],
          },
          {
            label: 'Messages',
            href: '/messages',
            icon: MessageSquare,
            badge: 'messages',
            shortcut: 'g m',
          },
          { label: 'Documents', href: '/documents', icon: FolderOpen },
          {
            label: 'Scheduling',
            href: '/scheduling',
            icon: Calendar,
            shortcut: 'g s',
          },
          {
            label: 'Video Calls',
            href: '/video-calls',
            icon: Video,
            shortcut: 'g v',
          },
        ],
      },
      {
        name: 'PROPERTY',
        items: [
          { label: 'Properties', href: '/properties', icon: Building2 },
          {
            label: 'Compliance',
            href: '/properties/compliance',
            icon: ClipboardCheck,
          },
          { label: 'Financials', href: '/financials', icon: PoundSterling },
          { label: 'Payments', href: '/payments', icon: CreditCard },
        ],
      },
      {
        name: 'LANDLORD',
        items: [
          {
            label: 'Tenant Reports',
            href: '/landlord/reports',
            icon: FileText,
          },
          {
            label: 'Reporting Links',
            href: '/landlord/reporting-links',
            icon: Link2,
          },
          { label: 'Contacts', href: '/landlord/contacts', icon: Contact },
          {
            label: 'Recurring Tasks',
            href: '/landlord/recurring',
            icon: RefreshCw,
          },
        ],
      },
      {
        name: 'ACCOUNT',
        items: [
          {
            label: 'Notifications',
            href: '/notifications',
            icon: Bell,
            badge: 'notifications',
          },
          { label: 'Profile', href: '/profile', icon: User, shortcut: 'g p' },
          {
            label: 'Subscription',
            href: '/homeowner/subscription',
            icon: BarChart3,
          },
          { label: 'Settings', href: '/settings', icon: Settings },
        ],
      },
    ],
    []
  );

  const contractorSections: NavSection[] = useMemo(
    () => [
      {
        name: 'MAIN',
        items: [
          {
            label: 'Dashboard',
            href: '/contractor/dashboard-enhanced',
            icon: Home,
            shortcut: 'g d',
          },
          {
            label: 'Discover',
            href: '/contractor/discover',
            icon: Compass,
            shortcut: 'g x',
          },
        ],
      },
      {
        name: 'WORK',
        items: [
          {
            label: 'Jobs',
            href: '/contractor/jobs',
            icon: Briefcase,
            shortcut: 'g j',
            children: [
              { label: 'All Jobs', href: '/contractor/jobs', icon: Briefcase },
              {
                label: 'Active',
                href: '/contractor/jobs?status=in_progress',
                icon: Briefcase,
              },
              {
                label: 'Completed',
                href: '/contractor/jobs?status=completed',
                icon: Briefcase,
              },
              {
                label: 'Find Jobs',
                href: '/contractor/jobs-near-you',
                icon: Sparkles,
              },
            ],
          },
          { label: 'Quotes', href: '/contractor/quotes', icon: FileText },
          {
            label: 'Messages',
            href: '/contractor/messages',
            icon: MessageSquare,
            badge: 'messages',
            shortcut: 'g m',
          },
          {
            label: 'Scheduling',
            href: '/contractor/scheduling',
            icon: Calendar,
            shortcut: 'g s',
          },
          {
            label: 'Documents',
            href: '/contractor/documents',
            icon: FolderOpen,
          },
          {
            label: 'Video Calls',
            href: '/video-calls',
            icon: Video,
            shortcut: 'g v',
          },
        ],
      },
      {
        name: 'BUSINESS',
        items: [
          { label: 'Social Feed', href: '/contractor/social', icon: Heart },
          {
            label: 'Connections',
            href: '/contractor/connections',
            icon: Users,
          },
          { label: 'Resources', href: '/contractor/resources', icon: Package },
          { label: 'Portfolio', href: '/contractor/portfolio', icon: Pencil },
          { label: 'Reviews', href: '/contractor/reviews', icon: Star },
          { label: 'Customers', href: '/contractor/customers', icon: Users },
          {
            label: 'Reporting',
            href: '/contractor/reporting',
            icon: TrendingUp,
          },
          {
            label: 'Marketing',
            href: '/contractor/marketing',
            icon: Megaphone,
          },
        ],
      },
      {
        name: 'FINANCIAL',
        items: [
          {
            label: 'Finance Dashboard',
            href: '/contractor/finance',
            icon: PoundSterling,
          },
          { label: 'Invoices', href: '/contractor/invoices', icon: Receipt },
          { label: 'Expenses', href: '/contractor/expenses', icon: CreditCard },
          {
            label: 'Subscription',
            href: '/contractor/subscription',
            icon: BarChart3,
          },
        ],
      },
      {
        name: 'ACCOUNT',
        items: [
          {
            label: 'Company Profile',
            href: '/contractor/profile',
            icon: Building2,
            shortcut: 'g p',
          },
          {
            label: 'Verification',
            href: '/contractor/verification',
            icon: Shield,
          },
          { label: 'Settings', href: '/settings', icon: Settings },
          {
            label: 'Notifications',
            href: '/notifications',
            icon: Bell,
            badge: 'notifications',
          },
        ],
      },
    ],
    []
  );

  const adminSections: NavSection[] = useMemo(
    () => [
      {
        name: 'MAIN',
        items: [
          {
            label: 'Dashboard',
            href: '/admin/dashboard',
            icon: Home,
            shortcut: 'g d',
          },
          {
            label: 'Analytics',
            href: '/admin/analytics-detail',
            icon: TrendingUp,
          },
        ],
      },
      {
        name: 'MANAGEMENT',
        items: [
          { label: 'Users', href: '/admin/users', icon: Users },
          { label: 'Revenue', href: '/admin/revenue', icon: PoundSterling },
          {
            label: 'Communications',
            href: '/admin/communications',
            icon: Megaphone,
          },
          {
            label: 'Building Assessments',
            href: '/admin/building-assessments',
            icon: Building2,
          },
        ],
      },
      {
        name: 'FINANCIAL',
        items: [
          {
            label: 'Escrow Reviews',
            href: '/admin/escrow/reviews',
            icon: Shield,
          },
          {
            label: 'Fee Management',
            href: '/admin/payments/fees',
            icon: Receipt,
          },
          {
            label: 'Payment Setup',
            href: '/admin/contractors/payment-setup',
            icon: CreditCard,
          },
        ],
      },
      {
        name: 'AI & MONITORING',
        items: [
          {
            label: 'AI Monitoring',
            href: '/admin/ai-monitoring',
            icon: Sparkles,
          },
          { label: 'Security', href: '/admin/security', icon: Shield },
          { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
        ],
      },
      {
        name: 'SYSTEM',
        items: [{ label: 'Settings', href: '/admin/settings', icon: Settings }],
      },
    ],
    []
  );

  return userRole === 'admin'
    ? adminSections
    : userRole === 'contractor'
      ? contractorSections
      : homeownerSections;
}
