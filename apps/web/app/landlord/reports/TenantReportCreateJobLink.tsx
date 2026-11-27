import Link from 'next/link';
import { FileText } from 'lucide-react';

export function TenantReportCreateJobLink({
  report,
  className,
}: {
  report: {
    id: string;
    job_id?: string | null;
    properties: { id: string } | null;
    status: string;
  };
  className: string;
}) {
  if (
    !report.properties ||
    report.job_id ||
    (report.status !== 'new' && report.status !== 'acknowledged')
  )
    return null;

  return (
    <Link
      className={className}
      href={{
        pathname: '/jobs/create',
        query: {
          tenant_report_id: report.id,
        },
      }}
    >
      <FileText size={15} aria-hidden='true' /> Create marketplace job
    </Link>
  );
}
