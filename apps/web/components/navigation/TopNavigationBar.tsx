'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: number;
}

interface TopNavigationBarProps {
  logo?: {
    src?: string;
    alt?: string;
    text?: string;
  };
  navItems: NavItem[];
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onUserMenuClick?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export function TopNavigationBar({
  logo = {
    text: 'Mintenance',
  },
  navItems,
  user,
  onUserMenuClick,
  onSettingsClick,
  className = '',
}: TopNavigationBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Close mobile menu when route changes
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <>
      <nav
        className={`top-navigation-bar ${className}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: theme.colors.white,
          borderBottom: `1px solid ${theme.colors.border}`,
          boxShadow: isScrolled ? theme.shadows.md : theme.shadows.sm,
          transition: 'box-shadow 0.3s ease',
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            padding: `0 ${theme.spacing[6]}`,
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing[4],
          }}
        >
          {/* Left: Logo */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            {logo.src ? (
              <img
                src={logo.src}
                alt={logo.alt || 'Logo'}
                style={{
                  width: '32px',
                  height: '32px',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: theme.colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.colors.white,
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.bold,
                }}
              >
                {logo.text?.charAt(0) || 'M'}
              </div>
            )}
            {logo.text && (
              <span
                style={{
                  fontSize: theme.typography.fontSize.xl,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                }}
              >
                {logo.text}
              </span>
            )}
          </Link>

          {/* Center: Navigation Links (Desktop) */}
          <div
            style={{
              display: 'none',
              alignItems: 'center',
              gap: theme.spacing[1],
              flex: 1,
              justifyContent: 'center',
            }}
            className="desktop-nav"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[1],
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  borderRadius: theme.borderRadius.md,
                  textDecoration: 'none',
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: isActive(item.href)
                    ? theme.typography.fontWeight.semibold
                    : theme.typography.fontWeight.medium,
                  color: isActive(item.href)
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                  backgroundColor: isActive(item.href)
                    ? theme.colors.backgroundSecondary
                    : 'transparent',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.href)) {
                    e.currentTarget.style.color = theme.colors.textPrimary;
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.href)) {
                    e.currentTarget.style.color = theme.colors.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.icon && (
                  <Icon
                    name={item.icon as any}
                    size={18}
                    color={isActive(item.href) ? theme.colors.primary : theme.colors.textSecondary}
                  />
                )}
                <span>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '4px',
                      backgroundColor: theme.colors.error,
                      color: theme.colors.white,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.bold,
                      padding: '2px 6px',
                      borderRadius: theme.borderRadius.full,
                      minWidth: '18px',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Right: User Profile & Settings */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              flexShrink: 0,
            }}
          >
            {/* Settings Button */}
            {onSettingsClick && (
              <button
                onClick={onSettingsClick}
                aria-label="Settings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: theme.borderRadius.md,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  e.currentTarget.style.color = theme.colors.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = theme.colors.textSecondary;
                }}
              >
                <Icon name="settings" size={20} color="currentColor" />
              </button>
            )}

            {/* User Profile */}
            {user ? (
              <button
                onClick={onUserMenuClick}
                aria-label="User menu"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                  borderRadius: theme.borderRadius.md,
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: theme.borderRadius.full,
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: theme.borderRadius.full,
                      backgroundColor: theme.colors.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.colors.white,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.semibold,
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  style={{
                    display: 'none',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.textPrimary,
                  }}
                  className="user-name-desktop"
                >
                  {user.name}
                </span>
                <Icon name="chevronDown" size={16} color={theme.colors.textSecondary} />
              </button>
            ) : (
              <Link
                href="/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.white,
                  textDecoration: 'none',
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.primaryDark;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = theme.shadows.md;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.primary;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Sign In
              </Link>
            )}

            {/* Hamburger Menu Button (Mobile) */}
            <button
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: theme.borderRadius.md,
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                gap: '6px',
                padding: theme.spacing[2],
                transition: 'all 0.2s ease',
              }}
              className="mobile-menu-button"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span
                style={{
                  width: '24px',
                  height: '2px',
                  backgroundColor: theme.colors.textPrimary,
                  transition: 'all 0.3s ease',
                  transform: isMobileMenuOpen ? 'rotate(45deg) translateY(8px)' : 'none',
                }}
              />
              <span
                style={{
                  width: '24px',
                  height: '2px',
                  backgroundColor: theme.colors.textPrimary,
                  transition: 'all 0.3s ease',
                  opacity: isMobileMenuOpen ? 0 : 1,
                }}
              />
              <span
                style={{
                  width: '24px',
                  height: '2px',
                  backgroundColor: theme.colors.textPrimary,
                  transition: 'all 0.3s ease',
                  transform: isMobileMenuOpen ? 'rotate(-45deg) translateY(-8px)' : 'none',
                }}
              />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          style={{
            display: isMobileMenuOpen ? 'block' : 'none',
            backgroundColor: theme.colors.white,
            borderTop: `1px solid ${theme.colors.border}`,
            maxHeight: 'calc(100vh - 64px)',
            overflowY: 'auto',
          }}
          className="mobile-menu"
        >
          <div
            style={{
              padding: theme.spacing[4],
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[1],
            }}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  padding: theme.spacing[3],
                  borderRadius: theme.borderRadius.md,
                  textDecoration: 'none',
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: isActive(item.href)
                    ? theme.typography.fontWeight.semibold
                    : theme.typography.fontWeight.medium,
                  color: isActive(item.href)
                    ? theme.colors.primary
                    : theme.colors.textPrimary,
                  backgroundColor: isActive(item.href)
                    ? theme.colors.backgroundSecondary
                    : 'transparent',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.href)) {
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.href)) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.icon && (
                  <Icon
                    name={item.icon as any}
                    size={20}
                    color={isActive(item.href) ? theme.colors.primary : theme.colors.textSecondary}
                  />
                )}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span
                    style={{
                      backgroundColor: theme.colors.error,
                      color: theme.colors.white,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.bold,
                      padding: '2px 8px',
                      borderRadius: theme.borderRadius.full,
                      minWidth: '20px',
                      textAlign: 'center',
                    }}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                {isActive(item.href) && (
                  <Icon name="check" size={16} color={theme.colors.primary} />
                )}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div style={{ height: '64px' }} />

      {/* Responsive Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (min-width: 768px) {
            .desktop-nav {
              display: flex !important;
            }
            .mobile-menu-button {
              display: none !important;
            }
            .mobile-menu {
              display: none !important;
            }
            .user-name-desktop {
              display: inline-block !important;
            }
          }
          @media (max-width: 767px) {
            .desktop-nav {
              display: none !important;
            }
            .mobile-menu-button {
              display: flex !important;
            }
          }
        `
      }} />
    </>
  );
}

