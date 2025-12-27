'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SkipLink {
  id: string;
  label: string;
  href: string;
}

interface SkipNavigationProps {
  links?: SkipLink[];
  className?: string;
}

/**
 * Skip navigation component for keyboard users and screen readers
 * Provides quick access to main content areas
 */
export function SkipNavigation({
  links = [
    { id: 'skip-to-main', label: 'Skip to main content', href: '#main-content' },
    { id: 'skip-to-nav', label: 'Skip to navigation', href: '#main-navigation' },
    { id: 'skip-to-footer', label: 'Skip to footer', href: '#footer' },
  ],
  className
}: SkipNavigationProps) {
  const handleSkipClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const target = document.getElementById(targetId);

    if (target) {
      // Set tabindex to make the target focusable if it isn't already
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }

      // Focus and scroll to the target
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav
      aria-label="Skip navigation"
      className={cn(
        'skip-navigation',
        'fixed top-0 left-0 z-[9999]',
        className
      )}
    >
      <ul className="flex flex-col">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={link.href}
              onClick={(e) => handleSkipClick(e, link.href)}
              className={cn(
                // Hidden by default, visible on focus
                'sr-only focus:not-sr-only',
                // Styling when visible
                'focus:absolute focus:top-0 focus:left-0',
                'focus:z-[9999] focus:block',
                'focus:bg-[#0066CC] focus:text-white',
                'focus:px-6 focus:py-3',
                'focus:text-base focus:font-semibold',
                'focus:no-underline focus:outline-none',
                'focus:shadow-lg focus:rounded-br-lg',
                // Animation
                'transition-all duration-200 ease-out',
                // Hover state
                'hover:bg-[#0052A3] hover:text-white'
              )}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Skip to main content link (simplified version for quick implementation)
 */
export function SkipToMain({
  href = '#main-content',
  label = 'Skip to main content',
  className
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        'skip-to-main',
        'sr-only focus:not-sr-only',
        'focus:absolute focus:top-4 focus:left-4',
        'focus:z-[9999] focus:inline-block',
        'focus:bg-[#0066CC] focus:text-white',
        'focus:px-4 focus:py-2 focus:rounded-md',
        'focus:font-semibold focus:no-underline',
        'focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#0066CC]',
        'transition-all duration-200',
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target instanceof HTMLElement) {
          target.setAttribute('tabindex', '-1');
          target.focus();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }}
    >
      {label}
    </a>
  );
}

/**
 * Hook to manage skip navigation
 */
export function useSkipNavigation() {
  React.useEffect(() => {
    // Add landmark roles if they don't exist
    const main = document.querySelector('main');
    const nav = document.querySelector('nav');
    const footer = document.querySelector('footer');

    if (main && !main.hasAttribute('role')) {
      main.setAttribute('role', 'main');
      main.setAttribute('id', 'main-content');
    }

    if (nav && !nav.hasAttribute('role')) {
      nav.setAttribute('role', 'navigation');
      nav.setAttribute('id', 'main-navigation');
    }

    if (footer && !footer.hasAttribute('role')) {
      footer.setAttribute('role', 'contentinfo');
      footer.setAttribute('id', 'footer');
    }
  }, []);
}

export default SkipNavigation;