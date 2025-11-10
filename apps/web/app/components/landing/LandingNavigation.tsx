'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Landing page navigation bar with logo and auth links
 * Fully responsive navigation visible on all screen sizes
 */
export function LandingNavigation() {
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    // Smooth scroll behavior for anchor links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      // Only handle if it's not a Next.js Link (which uses router)
      if (anchor && !anchor.closest('[data-nextjs-link]')) {
        const href = anchor.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const targetId = href.substring(1);
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            const headerOffset = 80; // Account for fixed header
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        }
      }
    };

    // Intersection Observer for active section highlighting
    const observerOptions = {
      root: null,
      rootMargin: '-80px 0px -50% 0px', // Account for fixed header
      threshold: 0.3
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections - delay to ensure DOM is ready
    const observeSections = () => {
      const sections = ['how-it-works', 'services', 'features'];
      sections.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          observer.observe(element);
        }
      });
    };

    // Try immediately and also after a short delay for dynamic content
    observeSections();
    const timeoutId = setTimeout(observeSections, 100);

    // Add click handlers to all anchor links
    document.addEventListener('click', handleAnchorClick, true);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      document.removeEventListener('click', handleAnchorClick, true);
    };
  }, []);

  const navLinks = [
    { href: '#how-it-works', label: 'How It Works', id: 'how-it-works' },
    { href: '#services', label: 'Services', id: 'services' },
    { href: '#features', label: 'Features', id: 'features' },
  ];

  return (
    <nav 
      id="navigation" 
      className="block fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200" 
      role="navigation" 
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Image 
              src="/assets/icon.png" 
              alt="Mintenance Logo" 
              width={40} 
              height={40} 
              className="w-10 h-10" 
            />
            <span className="ml-3 text-xl font-bold text-primary">
              Mintenance
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className={cn(
                  "transition-colors",
                  activeSection === link.id
                    ? "text-secondary font-semibold"
                    : "text-gray-700 hover:text-secondary"
                )}
                aria-current={activeSection === link.id ? 'page' : undefined}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-primary hover:text-secondary font-medium transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="bg-secondary text-white px-6 py-2 rounded-lg font-medium hover:bg-secondary-dark transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
