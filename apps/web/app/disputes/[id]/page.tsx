'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DisputeEvidenceLinks } from '@/components/disputes/DisputeEvidenceLinks';
import { PageLoader } from '@/components/LoadingButton';
import { Button } from '@/components/ui';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { disputeStatement } from '@/lib/disputes/history';
import { DisputeCaseDetail, type DisputeCase } from './DisputeCaseDetail';

export default function DisputeDetailPage() {
  const { id: disputeId } = useParams<{ id: string }>();
  const { user, loading } = useCurrentUser();
  const [dispute, setDispute] = useState<DisputeCase | null>(null);
  const [loadingDispute, setLoadingDispute] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const refresh = () => setReload((value) => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingDispute(true);
    setLoadError(null);
    fetch('/api/disputes/' + encodeURIComponent(disputeId), {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (
          !response.ok ||
          data?.id !== disputeId ||
          typeof data.status !== 'string'
        ) {
          throw new Error(
            typeof data?.error === 'string'
              ? data.error
              : data?.error?.message ||
                  'Unable to load dispute details. Please retry.'
          );
        }
        if (!controller.signal.aborted) setDispute(data);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setDispute(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Unable to load dispute details.'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDispute(false);
      });
    return () => controller.abort();
  }, [disputeId, reload]);

  if (loading || loadingDispute)
    return <PageLoader message='Loading dispute details' />;

  if (loadError || !dispute) {
    return (
      <div role='alert' className='card card-pad'>
        <p>{loadError || 'Dispute not found'}</p>
        <Button onClick={refresh}>Retry</Button>
      </div>
    );
  }

  if (dispute.archived) {
    const statement = disputeStatement(dispute.description);
    return (
      <main className='mx-auto max-w-3xl space-y-4 p-6'>
        <h1 className='text-2xl font-semibold'>Retained dispute record</h1>
        <p>
          This is a read-only record preserved after account or job deletion.
          Its retention is subject to review.
        </p>
        <h2 className='text-lg font-semibold'>Reason</h2>
        <p>{dispute.dispute_reason || 'No reason recorded'}</p>
        {statement && <p className='whitespace-pre-wrap'>{statement}</p>}
        {dispute.resolution && <p>Recorded outcome: {dispute.resolution}</p>}
        <DisputeEvidenceLinks items={dispute.dispute_evidence} />
        <Button onClick={refresh}>Refresh evidence links</Button>
      </main>
    );
  }

  return (
    <DisputeCaseDetail
      key={disputeId}
      disputeId={disputeId}
      dispute={dispute}
      contractor={user?.role === 'contractor'}
      onRefresh={refresh}
    />
  );
}
