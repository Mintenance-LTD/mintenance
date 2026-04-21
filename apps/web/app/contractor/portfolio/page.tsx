// Portfolio social feature archived; route users to the contractor profile page
// which already surfaces their company info, skills, reviews, and portfolio showcase.
import { redirect } from 'next/navigation';

export default function ContractorPortfolioPage() {
  redirect('/contractor/profile');
}
