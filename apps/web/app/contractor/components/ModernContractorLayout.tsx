'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Compass,
  Briefcase,
  MessageSquare,
  Calendar,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  ChevronRight,
  User,
} from 'lucide-react';

/**
 * MODERN CONTRACTOR LAYOUT
 * Professional Birch/Revealbot-Inspired Design
 *
 * Features:
 * - Sleek sidebar with icons and labels
 * - Professional header with search
 * - Clean, modern styling
 * - Responsive mobile menu
 */

type ContractorSummary = {
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  profile_image_url?: string | null;
  email?: string | null;
};

interface ModernContractorLayoutProps {
  children: ReactNode;
  contractor?: ContractorSummary | null;
  email?: string | null;
  userId?: string | null;
}

const navigation = [
  { name: 'Dashboard', href: '/contractor/dashboard-enhanced', icon: Home },
  { name: 'Discover', href: '/contractor/discover', icon: Compass },
  { name: 'Jobs', href: '/contractor/jobs', icon: Briefcase },
  { name: 'Messages', href: '/contractor/messages', icon: MessageSquare },
  { name: 'Calendar', href: '/contractor/calendar', icon: Calendar },
  { name: 'Quotes', href: '/contractor/quotes', icon: FileText },
  { name: 'Invoices', href: '/contractor/invoices', icon: CreditCard },
  { name: 'Reports', href: '/contractor/reporting', icon: BarChart3 },
  { name: 'Settings', href: '/contractor/settings', icon: Settings },
];

export function ModernContractorLayout({
  children,
  contractor,
  email,
  userId,
}: ModernContractorLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get user display name
  const displayName = contractor?.first_name
    ? `${contractor.first_name} ${contractor.last_name || ''}`.trim()
    : contractor?.company_name || email || 'User';

  // Get initials for avatar
  const initials = contractor?.first_name
    ? `${contractor.first_name[0]}${contractor.last_name?.[0] || ''}`.toUpperCase()
    : (email?.[0] || 'U').toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SIDEBAR - Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:overflow-y-auto lg:bg-white lg:border-r lg:border-gray-200">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-6 border-b border-gray-200">
            <Link href="/contractor/dashboard-enhanced" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 to-teal-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Mintenance</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                  />
                  <span>{item.name}</span>
                  {isActive && (
                    <ChevronRight className="ml-auto h-4 w-4" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="border-t border-gray-200 p-4">
            <Link
              href="/contractor/profile"
              className="flex items-center gap-3 rounded-xl p-2 hover:bg-gray-100 transition-colors"
            >
              {contractor?.profile_image_url ? (
                <img
                  src={contractor.profile_image_url}
                  alt={displayName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{email}</p>
              </div>
            </Link>
          </div>
        </div>
      </aside>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  className="-m-2.5 p-2.5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
                <div className="flex h-16 shrink-0 items-center">
                  <Link href="/contractor/dashboard-enhanced" className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 to-teal-600 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">M</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">Mintenance</span>
                  </Link>
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {navigation.map((item) => {
                          const isActive = pathname === item.href;
                          const Icon = item.icon;
                          return (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`
                                  group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6
                                  ${isActive
                                    ? 'bg-slate-900 text-white'
                                    : 'text-gray-700 hover:bg-gray-50'
                                  }
                                `}
                              >
                                <Icon className="h-6 w-6 shrink-0" />
                                {item.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="lg:pl-64">
        {/* TOP HEADER */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          {/* Mobile menu button */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-200 lg:hidden" />

          {/* Search bar */}
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <form className="relative flex flex-1 max-w-md" action="#" method="GET">
              <label htmlFor="search-field" className="sr-only">
                Search
              </label>
              <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400 ml-3" />
              <input
                id="search-field"
                className="block h-full w-full border-0 bg-transparent py-0 pl-10 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                placeholder="Search jobs, contractors..."
                type="search"
                name="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notifications */}
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
              >
                <Bell className="h-6 w-6" />
              </button>

              {/* Separator */}
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

              {/* Profile dropdown */}
              <Link href="/contractor/profile" className="flex items-center gap-x-3">
                {contractor?.profile_image_url ? (
                  <img
                    src={contractor.profile_image_url}
                    alt=""
                    className="h-8 w-8 rounded-full bg-gray-50 object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm font-semibold">
                    {initials}
                  </div>
                )}
                <span className="hidden lg:flex lg:items-center">
                  <span className="text-sm font-semibold leading-6 text-gray-900">{displayName}</span>
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
