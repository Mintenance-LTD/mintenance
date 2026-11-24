import type { ReactNode } from 'react';
import { Building2, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import type { ComplianceSummary } from './compliance-types';

export function ComplianceSummaryTiles({
  summary,
  isMintEditorial,
  unassessedOnly,
  onToggle,
}: {
  summary: ComplianceSummary;
  isMintEditorial: boolean;
  unassessedOnly: boolean;
  onToggle: () => void;
}) {
  const unassessedCount = summary.unassessedCount ?? 0;
  const unassessedTile = (
    <button
      type='button'
      className={`${isMintEditorial ? 'kpi' : 'rounded-xl border p-4'} border-amber-200 bg-amber-50 text-left`}
      aria-pressed={unassessedOnly}
      aria-controls='compliance-property-checks'
      disabled={unassessedCount === 0 && !unassessedOnly}
      onClick={onToggle}
    >
      <div className='label font-medium'>Not assessed</div>
      <div className='num text-2xl font-semibold'>{unassessedCount}</div>
      <div className='sub text-sm'>
        {unassessedOnly ? 'Show all checks' : 'Review outstanding checks'}
      </div>
    </button>
  );

  return (
    <>
      {isMintEditorial ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14,
            marginBottom: 22,
          }}
        >
          <div className='kpi'>
            <div className='label'>Properties</div>
            <div className='num'>{summary.totalProperties}</div>
            <div className='sub'>
              <span>under your management</span>
            </div>
          </div>
          <div className='kpi'>
            <div className='label'>Valid</div>
            <div className='num'>{summary.validCount}</div>
            <div className='sub'>
              <span>
                {summary.validCount === 1 ? 'certificate' : 'certificates'} in
                date
              </span>
            </div>
          </div>
          <div className='kpi'>
            <div className='label'>Expiring soon</div>
            <div className='num'>{summary.expiringCount}</div>
            <div className='sub'>
              <span>
                {summary.expiringCount > 0
                  ? 'within 90 days'
                  : 'nothing imminent'}
              </span>
            </div>
          </div>
          <div className='kpi'>
            <div className='label'>Recorded expired or missing</div>
            <div className='num'>
              {summary.expiredCount + summary.missingCount}
            </div>
            <div className='sub'>
              <span>
                {summary.expiredCount + summary.missingCount > 0
                  ? 'review applicable records'
                  : 'no recorded overdue items'}
              </span>
            </div>
          </div>
          {unassessedTile}
        </div>
      ) : (
        <div className='grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8'>
          <SummaryCard
            icon={<Building2 className='w-5 h-5 text-blue-600' />}
            label='Properties'
            value={summary.totalProperties}
            bgColor='bg-blue-50'
          />
          <SummaryCard
            icon={<ShieldCheck className='w-5 h-5 text-green-600' />}
            label='Valid'
            value={summary.validCount}
            bgColor='bg-green-50'
          />
          <SummaryCard
            icon={<ShieldAlert className='w-5 h-5 text-amber-600' />}
            label='Expiring Soon'
            value={summary.expiringCount}
            bgColor='bg-amber-50'
          />
          <SummaryCard
            icon={<ShieldX className='w-5 h-5 text-red-600' />}
            label='Recorded expired or missing'
            value={summary.expiredCount + summary.missingCount}
            bgColor='bg-red-50'
          />
          {unassessedTile}
        </div>
      )}
    </>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-xl p-4 border border-gray-100`}>
      <div className='flex items-center gap-2 mb-2'>
        {icon}
        <span className='text-sm text-gray-600'>{label}</span>
      </div>
      <p className='text-2xl font-bold text-gray-900'>{value}</p>
    </div>
  );
}
