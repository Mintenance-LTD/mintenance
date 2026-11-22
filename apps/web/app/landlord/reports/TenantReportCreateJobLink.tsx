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
    category: string;
    description: string;
    urgency: string;
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
          is_rental_property: 'true',
          property_id: report.properties.id,
          tenant_report_id: report.id,
          category: report.category,
          description: report.description,
          urgency: report.urgency,
        },
      }}
    >
      <FileText size={15} aria-hidden='true' /> Create job
    </Link>
  );
}
