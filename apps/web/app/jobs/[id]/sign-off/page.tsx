import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { JobSignOffClient } from './components/JobSignOffClient';
import { redirect } from 'next/navigation';
import { PageLayout, PageHeader } from '@/components/ui/PageLayout';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function JobSignOffPage({ params }: { params: { id: string } }) {
    const user = await getCurrentUserFromCookies();

    if (!user) {
        redirect('/login');
    }

    // Fetch job details
    const { data: job, error } = await supabase
        .from('jobs')
        .select(`
      id, 
      title, 
      status, 
      homeowner_id, 
      contractor_id,
      contractor:contractor_id (
        first_name, 
        last_name
      )
    `)
        .eq('id', params.id)
        .single();

    if (error || !job) {
        redirect('/jobs');
    }

    // Only allow homeowner to sign off (or admin, but let's stick to homeowner for now)
    if (job.homeowner_id !== user.id) {
        // If user is contractor, maybe show a "Waiting for sign-off" message?
        // For now, redirect.
        redirect(`/jobs/${params.id}`);
    }

    if (job.status === 'completed') {
        redirect(`/jobs/${params.id}`);
    }

    const contractor = Array.isArray(job.contractor) ? job.contractor[0] : job.contractor;
    const contractorName = contractor
        ? `${(contractor as any).first_name} ${(contractor as any).last_name}`
        : 'Contractor';

    return (
        <PageLayout>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <PageHeader
                    title="Complete Job"
                    description="Finalize the job and provide your signature."
                    backUrl={`/jobs/${params.id}`}
                />
                <JobSignOffClient
                    jobId={job.id}
                    jobTitle={job.title}
                    contractorName={contractorName}
                    currentUserRole={user.role}
                />
            </div>
        </PageLayout>
    );
}
