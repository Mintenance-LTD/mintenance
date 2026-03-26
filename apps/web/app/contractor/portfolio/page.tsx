// ARCHIVED: Portfolio social feature moved to apps/web/_archived/pages/contractor-portfolio-page.tsx
// The underlying /api/contractor/posts endpoint has been archived.

import { redirect } from 'next/navigation';

export default function ContractorPortfolioPage() {
  redirect('/contractor/gallery');
}
