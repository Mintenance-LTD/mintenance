'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: 'messages' | 'notifications' | number;
  children?: NavItem[];
  shortcut?: string;
}

export interface NavSection {
  name: string;
  items: NavItem[];
}

interface SidebarNavItemsProps {
  navSections: NavSection[];
  isCollapsed: boolean;
  collapsedSections: string[];
  expandedItems: string[];
  toggleSection: (name: string) => void;
  toggleExpand: (label: string) => void;
  isActive: (href: string) => boolean;
  getBadgeCount: (
    badge?: 'messages' | 'notifications' | number
  ) => number | null;
  prefersReducedMotion: boolean;
}

export function SidebarNavItems({
  navSections,
  isCollapsed,
  collapsedSections,
  expandedItems,
  toggleSection,
  toggleExpand,
  isActive,
  getBadgeCount,
  prefersReducedMotion,
}: SidebarNavItemsProps) {
  return (
    <nav className='flex-1 overflow-y-auto py-2 custom-scrollbar'>
      {navSections.map((section) => {
        const isSectionCollapsed = collapsedSections.includes(section.name);
        const sectionHasActivePage = section.items.some(
          (item) =>
            isActive(item.href) || item.children?.some((c) => isActive(c.href))
        );
        const showItems = !isSectionCollapsed || sectionHasActivePage;

        return (
          <div key={section.name} className='mb-1'>
            {!isCollapsed && (
              <button
                onClick={() => toggleSection(section.name)}
                className='w-full flex items-center justify-between px-6 pt-4 pb-1.5 group'
                aria-expanded={showItems}
              >
                <h3 className='text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-slate-400 transition-colors'>
                  {section.name}
                </h3>
                <ChevronDown
                  className={`w-3 h-3 text-slate-600 transition-transform duration-200 ${
                    isSectionCollapsed ? '-rotate-90' : ''
                  }`}
                />
              </button>
            )}

            {showItems &&
              section.items.map((item) => {
                const badgeCount = getBadgeCount(item.badge);
                const isItemActive = isActive(item.href);
                const isExpanded = expandedItems.includes(item.label);

                return (
                  <div key={item.label}>
                    {item.children ? (
                      <>
                        <button
                          onClick={() => toggleExpand(item.label)}
                          className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-all duration-200 ${
                            isItemActive
                              ? 'text-teal-400 bg-slate-800 border-l-4 border-teal-400'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-4 border-transparent'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                            isCollapsed ? 'justify-center' : ''
                          }`}
                          aria-expanded={isExpanded}
                          aria-label={`${item.label} menu`}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <item.icon className='w-5 h-5 flex-shrink-0' />
                          {!isCollapsed && (
                            <>
                              <span className='flex-1 text-left font-medium'>
                                {item.label}
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </>
                          )}
                        </button>

                        {!isCollapsed && (
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  duration: prefersReducedMotion ? 0 : 0.2,
                                }}
                                className='bg-slate-900/50 overflow-hidden'
                              >
                                {item.children.map((child) => (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    className={`flex items-center gap-3 px-6 pl-14 py-2.5 text-sm transition-all duration-200 ${
                                      isActive(child.href)
                                        ? 'text-teal-400 bg-slate-800 border-l-4 border-teal-400'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-4 border-transparent'
                                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset`}
                                    aria-current={
                                      isActive(child.href) ? 'page' : undefined
                                    }
                                  >
                                    <span>{child.label}</span>
                                  </Link>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-6 py-3 text-sm transition-all duration-200 ${
                          isItemActive
                            ? 'text-teal-400 bg-slate-800 border-l-4 border-teal-400'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-4 border-transparent'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                          isCollapsed ? 'justify-center' : ''
                        }`}
                        aria-current={isItemActive ? 'page' : undefined}
                        aria-label={
                          badgeCount
                            ? `${item.label} (${badgeCount} unread)`
                            : item.label
                        }
                        title={isCollapsed ? item.label : undefined}
                      >
                        <item.icon className='w-5 h-5 flex-shrink-0' />
                        {!isCollapsed && (
                          <>
                            <span className='flex-1 font-medium'>
                              {item.label}
                            </span>
                            {badgeCount !== null && badgeCount > 0 && (
                              <span
                                className={`${
                                  badgeCount > 10 ? 'bg-red-500' : 'bg-teal-500'
                                } text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center font-semibold`}
                                aria-label={`${badgeCount} unread`}
                              >
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}
    </nav>
  );
}
