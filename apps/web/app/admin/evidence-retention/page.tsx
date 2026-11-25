import {
  EvidenceReviewQueue,
  type EvidenceReviewFilter,
} from './EvidenceReviewQueue';

export default async function EvidenceRetentionPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const allowed = ['all', 'overdue', 'soon', 'held'] as const;
  const initialFilter = allowed.find((value) => value === filter) as
    | EvidenceReviewFilter
    | undefined;
  return <EvidenceReviewQueue initialFilter={initialFilter} />;
}
