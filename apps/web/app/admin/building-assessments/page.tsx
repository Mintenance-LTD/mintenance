import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BuildingAssessmentsClient } from './components/BuildingAssessmentsClient';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';

export const metadata = {
  title: 'Building Assessments | Mintenance Admin',
  description: 'Review and validate AI building damage assessments for training data',
};

export default async function BuildingAssessmentsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  // Fetch pending assessments
  const pendingAssessments = await DataCollectionService.getPendingAssessments(50, 0);
  const statistics = await DataCollectionService.getStatistics();

  return (
    <BuildingAssessmentsClient
      initialAssessments={pendingAssessments}
      initialStatistics={statistics}
    />
  );
}

