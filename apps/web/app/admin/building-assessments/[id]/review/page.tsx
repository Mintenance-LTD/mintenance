import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ExpertReviewForm } from '../../components/ExpertReviewForm';

export const metadata = { title: 'Photo-first review | Mintenance' };

export default async function PhotoReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  return (
    <main className='mx-auto max-w-4xl p-6'>
      <Link
        href='/admin/building-assessments/review-queue'
        className='underline'
      >
        Back to review queue
      </Link>
      <h1 className='mt-4 text-2xl font-semibold'>Review the photos first</h1>
      <p className='mt-2 text-gray-600'>
        The AI assessment is hidden on this page. Record what the photos
        support, without guessing a hidden cause or certifying the property is
        safe.
      </p>
      <ExpertReviewForm key={id} assessmentId={id} />
    </main>
  );
}
