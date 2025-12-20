import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AISearchClient } from './components/AISearchClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Search | Mintenance',
  description: 'Find contractors and jobs with AI-powered semantic search',
};

export default async function AISearchPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login');
  }

  return <AISearchClient user={user} />;
}
