'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MintEditorialDisputeCreate } from './MintEditorialDisputeCreate';
function CreateDisputeContent() {
  const params = useSearchParams();
  return (
    <MintEditorialDisputeCreate
      key={params.get('escrowId')}
      escrowId={params.get('escrowId')}
    />
  );
}
export default function CreateDisputePage() {
  return (
    <Suspense fallback={<p role='status'>Loading dispute form…</p>}>
      <CreateDisputeContent />
    </Suspense>
  );
}
