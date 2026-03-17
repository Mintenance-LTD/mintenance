/**
 * Re-export facade for backward compatibility.
 * The actual implementation has been split into smaller components
 * in the ./jobs/ directory:
 *   - JobsScreen.tsx (main orchestrator, <300 lines)
 *   - JobCard.tsx (job card component)
 *   - JobsHeroHeader.tsx (gradient hero header with search + stats)
 *   - JobsFilterTabs.tsx (sort/filter tab bar)
 *   - JobsEmptyState.tsx (empty state with suggestions)
 *   - ProgressDots.tsx (job lifecycle progress indicator)
 *   - types.ts (shared types and constants)
 */
export { JobsScreen } from './jobs';
export { default } from './jobs/JobsScreen';
