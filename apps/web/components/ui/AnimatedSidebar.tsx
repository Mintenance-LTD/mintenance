'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from './Icon';

/**
 * Animated Sidebar Component
 * Modern collapsible sidebar with smooth animations
 * Based on: https://www.figma.com/design/TYAAeh5A3gD3YYRXEba3TX/Animated-Sidebar-for-Web-Dashboards
 */

interface NavItem {
  icon: string;
  label: string;
  href: string;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface AnimatedSidebarProps {
  sections: NavSection[];
  userInfo?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  onLogout?: () => void;
}

export function AnimatedSidebar({ sections, userInfo, onLogout }: AnimatedSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const pathname = usePathname();

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside
      style={{
        width: isExpanded ? '280px' : '80px',
        height: '100vh',
        backgroundColor: theme.colors.surface,
        borderRight: `1px solid ${theme.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* Logo & Toggle */}
      <div
        style={{
          padding: theme.spacing[6],
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '72px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>M</span>
          </div>
          {isExpanded && (
            <span
              style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                whiteSpace: 'nowrap',
                opacity: isExpanded ? 1 : 0,
                transition: 'opacity 0.2s',
              }}
            >
              Mintenance
            </span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          style={{
            width: 32,
            height: 32,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.backgroundSecondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.primary;
            e.currentTarget.style.borderColor = theme.colors.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
            e.currentTarget.style.borderColor = theme.colors.border;
          }}
        >
          <Icon
            name={isExpanded ? 'chevronLeft' : 'chevronRight'}
            size={16}
            color={theme.colors.textSecondary}
          />
        </button>
      </div>

      {/* User Profile */}
      {userInfo && (
        <div
          style={{
            padding: theme.spacing[4],
            borderBottom: `1px solid ${theme.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            {userInfo.avatar ? (
              <img
                src={userInfo.avatar}
                alt={userInfo.name}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              userInfo.name.charAt(0).toUpperCase()
            )}
          </div>
          {isExpanded && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div
                style={{
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {userInfo.name}
              </div>
              <div
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {userInfo.email}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Sections */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: theme.spacing[4],
        }}
      >
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} style={{ marginBottom: theme.spacing[6] }}>
            {/* Section Title */}
            {isExpanded && (
              <div
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textTertiary,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  marginBottom: theme.spacing[2],
                  paddingLeft: theme.spacing[2],
                  opacity: isExpanded ? 1 : 0,
                  transition: 'opacity 0.2s',
                }}
              >
                {section.title}
              </div>
            )}

            {/* Nav Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
              {section.items.map((item, itemIndex) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={itemIndex}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[3],
                      padding: `${theme.spacing[3]} ${theme.spacing[3]}`,
                      borderRadius: theme.borderRadius.lg,
                      backgroundColor: active ? theme.colors.primaryLight : 'transparent',
                      color: active ? 'white' : theme.colors.textSecondary,
                      textDecoration: 'none',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'transform 0.2s',
                      }}
                    >
                      <Icon
                        name={item.icon}
                        size={20}
                        color={active ? 'white' : theme.colors.textSecondary}
                      />
                    </div>

                    {/* Label */}
                    {isExpanded && (
                      <span
                        style={{
                          fontSize: theme.typography.fontSize.base,
                          fontWeight: active
                            ? theme.typography.fontWeight.semibold
                            : theme.typography.fontWeight.medium,
                          whiteSpace: 'nowrap',
                          flex: 1,
                          opacity: isExpanded ? 1 : 0,
                          transition: 'opacity 0.2s',
                        }}
                      >
                        {item.label}
                      </span>
                    )}

                    {/* Badge */}
                    {isExpanded && item.badge && item.badge > 0 && (
                      <div
                        style={{
                          minWidth: 20,
                          height: 20,
                          borderRadius: theme.borderRadius.full,
                          backgroundColor: active ? 'white' : theme.colors.error,
                          color: active ? theme.colors.primary : 'white',
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.bold,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 6px',
                        }}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </div>
                    )}

                    {/* Active Indicator */}
                    {active && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 4,
                          height: '60%',
                          backgroundColor: 'white',
                          borderRadius: '0 4px 4px 0',
                        }}
                      />
                    )}

                    {/* Tooltip for collapsed state */}
                    {!isExpanded && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '100%',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          marginLeft: theme.spacing[2],
                          padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                          backgroundColor: theme.colors.primary,
                          color: 'white',
                          fontSize: theme.typography.fontSize.sm,
                          fontWeight: theme.typography.fontWeight.medium,
                          borderRadius: theme.borderRadius.md,
                          whiteSpace: 'nowrap',
                          opacity: 0,
                          pointerEvents: 'none',
                          transition: 'opacity 0.2s',
                          boxShadow: theme.shadows.lg,
                          zIndex: 1000,
                        }}
                        className="sidebar-tooltip"
                      >
                        {item.label}
                        {item.badge && item.badge > 0 && (
                          <span
                            style={{
                              marginLeft: theme.spacing[2],
                              backgroundColor: 'rgba(255,255,255,0.2)',
                              padding: '2px 6px',
                              borderRadius: theme.borderRadius.sm,
                              fontSize: theme.typography.fontSize.xs,
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Actions */}
      <div
        style={{
          padding: theme.spacing[4],
          borderTop: `1px solid ${theme.colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[2],
        }}
      >
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
              padding: `${theme.spacing[3]} ${theme.spacing[3]}`,
              borderRadius: theme.borderRadius.lg,
              backgroundColor: 'transparent',
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.error,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.errorLight;
              e.currentTarget.style.borderColor = theme.colors.error;
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = theme.colors.border;
              e.currentTarget.style.color = theme.colors.error;
            }}
          >
            <Icon name="alert" size={20} color="currentColor" />
            {isExpanded && (
              <span
                style={{
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.medium,
                  whiteSpace: 'nowrap',
                }}
              >
                Logout
              </span>
            )}
          </button>
        )}
      </div>

      {/* CSS for tooltip hover effect */}
      <style jsx>{`
        a:hover .sidebar-tooltip {
          opacity: 1 !important;
        }
      `}</style>
    </aside>
  );
}

/**
 * Main Layout with Animated Sidebar
 */
interface SidebarLayoutProps {
  children: React.ReactNode;
  sections: NavSection[];
  userInfo?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  onLogout?: () => void;
}

export function SidebarLayout({ children, sections, userInfo, onLogout }: SidebarLayoutProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AnimatedSidebar sections={sections} userInfo={userInfo} onLogout={onLogout} />
      <main
        style={{
          marginLeft: isExpanded ? '280px' : '80px',
          flex: 1,
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: theme.colors.backgroundSecondary,
        }}
      >
        {children}
      </main>
    </div>
  );
}

