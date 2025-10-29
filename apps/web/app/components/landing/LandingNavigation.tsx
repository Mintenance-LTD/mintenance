'use client';

import Link from 'next/link';
import Image from 'next/image';

/**
 * Landing page navigation bar with logo and auth links
 * Fully responsive navigation visible on all screen sizes
 */
export function LandingNavigation() {
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
            <a 
              href="#how-it-works" 
              className="text-gray-700 hover:text-secondary transition-colors"
            >
              How It Works
            </a>
            <a 
              href="#services" 
              className="text-gray-700 hover:text-secondary transition-colors"
            >
              Services
            </a>
            <a 
              href="#features" 
              className="text-gray-700 hover:text-secondary transition-colors"
            >
              Features
            </a>
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
