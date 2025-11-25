import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { QuoteDetailsClient } from './components/QuoteDetailsClient';
import { redirect } from 'next/navigation';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function QuoteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
        redirect('/login');
    }

    const { data: quote, error } = await supabase
        .from('contractor_quotes')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !quote) {
        redirect('/contractor/quotes');
    }

    return <QuoteDetailsClient quote={quote} />;
}
