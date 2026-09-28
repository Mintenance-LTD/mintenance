'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type {
  buildReviewReport,
  rate,
} from '@/lib/services/building-surveyor/evaluation/report';

function percentage(metric: ReturnType<typeof rate>) {
  if (metric.value === null) return 'No data';
  return `${(metric.value * 100).toFixed(1)}% (${metric.successes}/${metric.total}; 95% interval ${(metric.lower95! * 100).toFixed(0)}–${(metric.upper95! * 100).toFixed(0)}%)`;
}
export function ExpertEvaluationPanel() {
  const [report, setReport] = useState<ReturnType<
    typeof buildReviewReport
  > | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        '/api/admin/building-assessments/evaluation'
      );
      if (!response.ok)
        throw new Error(
          'Report unavailable. Check admin access and the expert-review migration.'
        );
      setReport(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report unavailable');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className='my-6 rounded-lg border bg-white p-5 space-y-3'
      aria-label='Expert evaluation'
    >
      <h2 className='text-lg font-semibold'>Mint AI expert evaluation</h2>
      <p className='text-sm text-gray-600'>
        Compare saved predictions with expert reference reviews. These
        historical cases are not an unseen-site benchmark. Confidence intervals
        treat cases as independent; related site images can reduce the effective
        sample size.
      </p>
      <Button onClick={load} disabled={busy}>
        {busy ? 'Loading…' : 'Refresh evaluation'}
      </Button>
      <p role='status'>{error}</p>
      {report && (
        <>
          <p>
            {report.reviewCount} review revisions · {report.scored} source
            versions scored · {report.conflicts} disagreements excluded ·{' '}
            {report.insufficientEvidence} insufficient-evidence cases excluded
          </p>
          {report.groups.length === 0 && (
            <p>
              No scoreable expert reviews yet. Open an assessment with photos
              and complete its expert reference review.
            </p>
          )}
          {report.groups.map((group) => (
            <div
              className='border-t pt-3'
              key={`${group.domain}-${group.provider}-${group.model}-${group.promptVersion}`}
            >
              <h3 className='font-medium'>
                {group.domain} · {group.provider} / {group.model} ·{' '}
                {group.promptVersion}
              </h3>
              <p>
                {group.count} cases · {group.propertyCount} properties ·{' '}
                {group.unanchoredCount} without a property
              </p>
              <dl className='text-sm space-y-1'>
                <div>
                  <dt className='inline font-medium'>
                    Primary defect agreement:{' '}
                  </dt>
                  <dd className='inline'>
                    {percentage(group.damageAgreement)}
                  </dd>
                </div>
                <div>
                  <dt className='inline font-medium'>Severity agreement: </dt>
                  <dd className='inline'>
                    {percentage(group.severityAgreement)}
                  </dd>
                </div>
                <div>
                  <dt className='inline font-medium'>Urgency agreement: </dt>
                  <dd className='inline'>
                    {percentage(group.urgencyAgreement)}
                  </dd>
                </div>
                <div>
                  <dt className='inline font-medium'>
                    Critical-hazard recall:{' '}
                  </dt>
                  <dd className='inline'>
                    {percentage(group.criticalHazardRecall)}
                  </dd>
                </div>
                <div>
                  <dt className='inline font-medium'>
                    Critical-hazard precision:{' '}
                  </dt>
                  <dd className='inline'>
                    {percentage(group.criticalHazardPrecision)}
                  </dd>
                </div>
              </dl>
              <p className='text-sm'>
                {group.criticalMisses} critical hazards missed ·{' '}
                {group.criticalFalseAlarms} critical false alarms ·{' '}
                {group.missingHazardJudgements} missing AI hazard judgements
              </p>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
