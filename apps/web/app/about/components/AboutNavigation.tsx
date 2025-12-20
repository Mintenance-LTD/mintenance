import Link from 'next/link';
import Logo from '../../components/Logo';
import { ArrowLeft } from 'lucide-react';

/**
 * About Page Navigation Component
 */
export function AboutNavigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center" aria-label="Mintenance Home">
            <Logo />
            <span className="ml-3 text-xl font-bold text-primary">Mintenance</span>
          </Link>
          <Link
            href="/"
            className="text-gray-700 hover:text-secondary transition-colors flex items-center gap-2"
            aria-label="Back to home page"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to Home
          </Link>
        </div>
      </div>
    </nav>
  );
}

