export interface NavItem {
  icon: string;
  label: string;
  href: string;
  badge?: 'verifications' | 'escrow';
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const adminNavSections: readonly NavSection[] = Object.freeze([
  {
    title: '',
    items: [
      { icon: 'dashboard', label: 'Dashboard', href: '/admin' },
      { icon: 'briefcase', label: 'Jobs', href: '/admin/jobs' },
      { icon: 'scale', label: 'Disputes', href: '/admin/disputes' },
    ],
  },
  {
    title: 'Users & Comms',
    items: [
      {
        icon: 'users',
        label: 'Users',
        href: '/admin/users',
        badge: 'verifications',
      },
      {
        icon: 'userCheck',
        label: 'Verifications',
        href: '/admin/verifications',
      },
      {
        icon: 'messages',
        label: 'Communications',
        href: '/admin/communications',
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      { icon: 'trendingUp', label: 'Revenue', href: '/admin/revenue' },
      { icon: 'chart', label: 'Analytics', href: '/admin/analytics-detail' },
      {
        icon: 'fileCheck',
        label: 'Escrow Reviews',
        href: '/admin/escrow/reviews',
        badge: 'escrow',
      },
      {
        icon: 'dollarSign',
        label: 'Fee Management',
        href: '/admin/payments/fees',
      },
      {
        icon: 'receiptText',
        label: 'Refunds',
        href: '/admin/refunds',
      },
      {
        icon: 'bank',
        label: 'Reconciliation',
        href: '/admin/payments/reconciliation',
      },
      {
        icon: 'creditCard',
        label: 'Payment Setup',
        href: '/admin/contractors/payment-setup',
      },
      { icon: 'currencyPound', label: 'Tax', href: '/admin/tax' },
    ],
  },
  {
    title: 'AI & Assessments',
    items: [
      {
        icon: 'building',
        label: 'Assessments',
        href: '/admin/building-assessments',
      },
      { icon: 'brain', label: 'AI Monitoring', href: '/admin/ai-monitoring' },
      {
        icon: 'activity',
        label: 'Hybrid Inference',
        href: '/admin/hybrid-inference',
      },
    ],
  },
  {
    title: 'Security & Ops',
    items: [
      { icon: 'shield', label: 'Security', href: '/admin/security' },
      { icon: 'clipboard', label: 'Audit Logs', href: '/admin/audit-logs' },
      {
        icon: 'refresh',
        label: 'Migrations',
        href: '/admin/migration-dashboard',
      },
      { icon: 'fileText', label: 'API Docs', href: '/admin/api-documentation' },
      { icon: 'settings', label: 'Settings', href: '/admin/settings' },
    ],
  },
]);
