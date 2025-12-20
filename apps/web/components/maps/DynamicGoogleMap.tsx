/**
 * Dynamic Google Map Component
 *
 * This component uses next/dynamic to code-split the GoogleMapContainer
 * and its dependencies, reducing initial bundle size.
 *
 * Benefits:
 * - Reduces initial JS bundle by ~150KB (Google Maps SDK)
 * - Loads map asynchronously when needed
 * - Shows proper loading state
 * - SSR-safe (client-side only)
 */

import dynamic from 'next/dynamic';
import { MapSkeleton } from '@/components/ui/skeletons';

// Dynamic import with loading skeleton
export const DynamicGoogleMap = dynamic(
  () => import('./GoogleMapContainer').then((mod) => ({
    default: mod.GoogleMapContainer
  })),
  {
    loading: () => <MapSkeleton />,
    ssr: false, // Maps require browser APIs
  }
);
