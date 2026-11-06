/** Approval and escrow release are separate from the completed job status. */
export function getJobTimelineStep(
  status: string,
  approved: boolean,
  escrowStatus: string | null,
  contractStatus: string | null = null
): number {
  if (status === 'cancelled') return -1;
  if (escrowStatus === 'released' || escrowStatus === 'completed') return 8;
  if (status === 'completed' && approved) return 7;
  if (status === 'assigned') {
    if (escrowStatus === 'held' || escrowStatus === 'release_pending') return 4;
    if (contractStatus === 'accepted') return 3;
  }
  return (
    (
      { posted: 0, assigned: 2, in_progress: 5, completed: 6 } as Record<
        string,
        number
      >
    )[status] ?? 0
  );
}

/** Contract, funding and approval require their own evidence, not a later job status. */
export function getJobTimelineMilestones(
  status: string,
  approved: boolean,
  escrowStatus: string | null,
  contractStatus: string | null,
  hasBids: boolean
): boolean[] {
  const assigned = ['assigned', 'in_progress', 'completed'].includes(status);
  const released = ['released', 'completed'].includes(escrowStatus ?? '');
  return [
    ['posted', 'assigned', 'in_progress', 'completed', 'cancelled'].includes(
      status
    ),
    hasBids,
    assigned,
    contractStatus === 'accepted',
    ['held', 'release_pending'].includes(escrowStatus ?? '') || released,
    ['in_progress', 'completed'].includes(status),
    status === 'completed',
    status === 'completed' && approved,
    released,
  ];
}
