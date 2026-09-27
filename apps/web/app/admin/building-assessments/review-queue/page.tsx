import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { isAssessmentUnassessable } from '@mintenance/shared';
import { getAssessmentResult } from '@/lib/services/building-surveyor/assessment-result';

export const metadata = { title: 'Photo review queue | Mintenance' };

export default async function ReviewQueuePage() {
  const user = await getCurrentUserFromCookies();
  if (!user || user.role !== 'admin') redirect('/admin/login');
  const { data, error } = await serverSupabase
    .from('building_assessments')
    .select('id,created_at,assessment_data,validation_status,property_id')
    .neq('validation_status', 'processing')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error('Unable to load the photo review queue');
  const candidates = (data ?? []).filter((row) => {
    const notes = String(
      (row.assessment_data as Record<string, unknown>)?.manual_notes ?? ''
    );
    return (
      !/\bQA\b|synthetic|SDNET/i.test(notes) &&
      (getAssessmentResult(row.assessment_data) ||
        isAssessmentUnassessable(row.assessment_data))
    );
  });
  return (
    <main className='mx-auto max-w-4xl p-6'>
      <h1 className='text-2xl font-semibold'>Your photo review queue</h1>
      <p className='mt-2 text-gray-600'>
        Review photos before seeing the AI answer. These are the latest eligible
        records from the 100 most recent assessments; marked QA examples are
        omitted. Reviews are observations, not building safety certificates or
        automatic training approval.
      </p>
      <Link
        className='mt-3 inline-block underline'
        href='/admin/building-assessments'
      >
        Assessment dashboard
      </Link>
      <ul className='mt-6 space-y-3'>
        {candidates.map((row, index) => (
          <li key={row.id} className='rounded-lg border p-4'>
            <Link
              className='font-medium underline'
              href={`/admin/building-assessments/${row.id}/review`}
            >
              Review photo set {index + 1}
            </Link>
            <p className='text-sm text-gray-600'>
              {new Date(row.created_at).toLocaleDateString('en-GB')} ·{' '}
              {row.property_id
                ? 'Property linked'
                : 'Property link needed before training'}
            </p>
          </li>
        ))}
      </ul>
      {!candidates.length && (
        <p className='mt-6'>No eligible photo sets are available yet.</p>
      )}
    </main>
  );
}
