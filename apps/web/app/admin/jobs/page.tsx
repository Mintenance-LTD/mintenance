import { JobManagementClient } from './components/JobManagementClient';

export const metadata = {
  title: 'Job Management | Admin | Mintenance',
};

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string; disputed?: string }> }) {
  const filters = await searchParams;
  return <JobManagementClient
    initialStatus={typeof filters.status === 'string' ? filters.status : undefined}
    initialSearch={typeof filters.search === 'string' ? filters.search : undefined}
    initialDisputed={filters.disputed === 'true'}
  />;
}
