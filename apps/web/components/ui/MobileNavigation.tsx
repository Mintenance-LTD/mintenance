'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from './Button';
import { theme } from '@/lib/theme';

interface MobileNavigationProps {
  items: Array<{
    label: string;
    href: string;
    icon?: React.ReactNode;
    badge?: number;
  }>;
  className?: string;
  style?: React.CSSProperties;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  items,
  className = '',
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const containerStyles = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'white',
    borderBottom: `1px solid ${theme.colors.border}`,
    transition: 'all 0.3s ease-in-out',
    boxShadow: isScrolled ? theme.shadows.lg : 'none',
    ...style,
  };

  const navStyles = {
    maxWidth: '100%',
    margin: '0 auto',
    padding: `0 ${theme.spacing[4]}`,
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const logoStyles = {
    display: 'flex',
    alignItems: 'center',
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    textDecoration: 'none',
  };

  const menuButtonStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    borderRadius: theme.borderRadius.base,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
  };

  const hamburgerStyles = {
    width: '24px',
    height: '2px',
    backgroundColor: theme.colors.textPrimary,
    transition: 'all 0.3s ease-in-out',
    position: 'relative' as const,
    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
  };

  const hamburgerBeforeStyles = {
    content: '""',
    position: 'absolute' as const,
    top: '-8px',
    left: '0',
    width: '24px',
    height: '2px',
    backgroundColor: theme.colors.textPrimary,
    transition: 'all 0.3s ease-in-out',
    transform: isOpen ? 'rotate(90deg) translateX(8px)' : 'rotate(0deg)',
  };

  const hamburgerAfterStyles = {
    content: '""',
    position: 'absolute' as const,
    top: '8px',
    left: '0',
    width: '24px',
    height: '2px',
    backgroundColor: theme.colors.textPrimary,
    transition: 'all 0.3s ease-in-out',
    opacity: isOpen ? 0 : 1,
  };

  const menuStyles = {
    position: 'fixed' as const,
    top: '64px',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.3s ease-in-out',
    zIndex: 40,
    padding: theme.spacing[6],
    overflowY: 'auto' as const,
  };

  const menuItemStyles = {
    display: 'block',
    padding: `${theme.spacing[4]} 0`,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    textDecoration: 'none',
    borderBottom: `1px solid ${theme.colors.border}`,
    transition: 'color 0.2s ease-in-out',
  };

  const badgeStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    padding: `0 ${theme.spacing[1]}`,
    marginLeft: theme.spacing[2],
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: 'white',
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.full,
  };

  return (
    <>
      <div className={`mobile-navigation ${className}`} style={containerStyles}>
        <nav style={navStyles}>
          <Link href="/" style={logoStyles}>
            <span>Mintenance</span>
          </Link>
          
          <button
            type="button"
            onClick={toggleMenu}
            style={menuButtonStyles}
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
          >
            <div style={hamburgerStyles}>
              <div style={hamburgerBeforeStyles} />
              <div style={hamburgerAfterStyles} />
            </div>
          </button>
        </nav>
      </div>

      <div style={menuStyles}>
        {items.map((item, index) => {
          const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            if (item.href.startsWith('#')) {
              e.preventDefault();
              const targetId = item.href.substring(1);
              const targetElement = document.getElementById(targetId);
              if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({
                  top: offsetPosition,
                  behavior: 'smooth'
                });
              }
              closeMenu();
            } else {
              closeMenu();
            }
          };

          return (
            <Link
              key={index}
              href={item.href}
              style={menuItemStyles}
              onClick={handleClick}
              className="hover:text-primary"
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {item.icon && (
                  <span style={{ marginRight: theme.spacing[2] }}>
                    {item.icon}
                  </span>
                )}
                {item.label}
                {item.badge && item.badge > 0 && (
                  <span style={badgeStyles}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        
        <div style={{ marginTop: theme.spacing[8] }}>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <Button
              variant="outline"
              fullWidth
              style={{ marginBottom: theme.spacing[3] }}
            >
              Log In
            </Button>
          </Link>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <Button
              variant="primary"
              fullWidth
            >
              Get Started
            </Button>
          </Link>
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 30,
          }}
          onClick={closeMenu}
        />
      )}

      <style jsx>{`
        .mobile-navigation {
          -webkit-tap-highlight-color: transparent;
        }
        
        .mobile-navigation button:active {
          transform: scale(0.95);
        }
        
        .mobile-navigation a:hover {
          color: ${theme.colors.primary};
        }
      `}</style>
    </>
  );
};
