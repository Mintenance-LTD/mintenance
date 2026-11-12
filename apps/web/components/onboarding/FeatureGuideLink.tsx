'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, ChevronDown, ArrowUpRight } from 'lucide-react';
import { FEATURE_GUIDES } from '@mintenance/shared';
import styles from './Onboarding.module.css';
/** Discoverable on supported feature pages without covering the user's work. */
export function FeatureGuideLink() {
  const pathname = usePathname();
  const guide = [...FEATURE_GUIDES]
    .sort((a, b) => b.href.length - a.href.length)
    .find((g) => pathname === g.href || pathname?.startsWith(g.href + '/'));
  if (!guide) return null;
  return (
    <details
      key={pathname}
      data-theme='mint-editorial'
      className={styles.featureHelp}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.currentTarget.open = false;
          event.currentTarget.querySelector('summary')?.focus();
        }
      }}
    >
      <summary>
        <BookOpen size={17} aria-hidden='true' /> Page help{' '}
        <ChevronDown size={14} aria-hidden='true' />
      </summary>
      <nav aria-label='Feature guides' className={styles.featureHelpPanel}>
        <p>Need a hand?</p>
        <Link
          href={`/getting-started?persona=${guide.personas[0]}&guide=${guide.id}`}
        >
          <span>{guide.title}</span>
          <ArrowUpRight size={16} aria-hidden='true' />
        </Link>
        <Link href='/getting-started'>
          All feature guides <ArrowUpRight size={16} aria-hidden='true' />
        </Link>
      </nav>
    </details>
  );
}
