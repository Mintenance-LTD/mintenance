import Link from 'next/link';

export function ReportConversationLink({ reportId }: { reportId: string }) {
  return (
    <Link className='underline' href={`/maintenance/reports/${reportId}`}>
      Open shared issue conversation
    </Link>
  );
}
