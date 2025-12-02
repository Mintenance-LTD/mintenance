'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AuthLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'muted';
}

export function AuthLink({ href, children, className, variant = 'default' }: AuthLinkProps) {
  const variantClasses = {
    default: 'text-gray-600 hover:text-[#0066CC]',
    primary: 'text-[#0066CC] hover:text-[#0052A3] font-semibold',
    muted: 'text-gray-500 hover:text-gray-700',
  };

  return (
    <Link
      href={href}
      className={cn(
        'transition-colors duration-200 focus:outline-none focus:underline',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}
