'use client';

import Link from 'next/link';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import Logo from '@/app/components/Logo';

interface LogoLinkProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export function LogoLink({ className = '', showText = true, textClassName = '' }: LogoLinkProps) {
  const { user } = useCurrentUser();
  
  // Determine redirect based on auth status
  const href = user ? '/dashboard' : '/';
  
  return (
    <Link href={href} className={className} style={{ textDecoration: 'none' }}>
      <Logo />
      {showText && (
        <span className={textClassName}>
          Mintenance
        </span>
      )}
    </Link>
  );
}

