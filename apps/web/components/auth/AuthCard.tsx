'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
  showGradient?: boolean;
}

export function AuthCard({ children, className, showGradient = true }: AuthCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-2xl shadow-xl p-8 sm:p-10 group relative overflow-hidden",
      "transition-shadow duration-300 hover:shadow-2xl",
      className
    )}>
      {showGradient && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0066CC] via-[#0080FF] to-[#0066CC] opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10" />
      )}
      {children}
    </div>
  );
}
