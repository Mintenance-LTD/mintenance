'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
    <div data-theme='mint-editorial' className={styles.featureBar}>
      <Link
        className='underline'
        href={`/getting-started?persona=${guide.personas[0]}&guide=${guide.id}`}
      >
        Guide: {guide.title}
      </Link>
      <Link className='underline' href='/getting-started'>
        All feature guides
      </Link>
    </div>
  );
}
