/** Approval and escrow release are separate from the completed job status. */
export function getJobTimelineStep(
  status: string,
  approved: boolean,
  escrowStatus: string | null
): number {
  if (status === 'cancelled') return -1;
  if (escrowStatus === 'released' || escrowStatus === 'completed') return 8;
  if (status === 'completed' && approved) return 7;
  return (
    (
      { posted: 0, assigned: 2, in_progress: 5, completed: 6 } as Record<
        string,
        number
      >
    )[status] ?? 0
  );
}
