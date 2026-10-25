'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import styles from './Onboarding.module.css';

export function ReplayQuickTour({
  userId,
  audience,
}: {
  userId: string;
  audience: 'homeowner' | 'contractor' | 'team-member';
}) {
  const router = useRouter();
  const journey = useJourneyProgress(userId, `intro-${audience}`);
  const [opening, setOpening] = useState(false);
  return (
    <button
      type='button'
      className={styles.secondary}
      disabled={opening}
      onClick={async () => {
        setOpening(true);
        await journey.save({ status: 'in_progress', step: 0 });
        router.push(
          audience === 'homeowner'
            ? '/dashboard'
            : '/contractor/dashboard-enhanced'
        );
        setOpening(false);
      }}
    >
      <Play size={14} aria-hidden='true' />
      {opening ? 'Opening tour…' : 'Replay quick tour'}
    </button>
  );
}
