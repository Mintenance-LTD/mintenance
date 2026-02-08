import { redirect } from 'next/navigation';

// Alias route for data annotation interface
// Redirects to building-assessments page for consistency
export default function DataAnnotationPage() {
  redirect('/admin/building-assessments');
}
