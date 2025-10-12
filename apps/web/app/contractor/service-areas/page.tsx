import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ServiceAreasClient } from './components/ServiceAreasClient';

export default async function ServiceAreasPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const serviceAreas: any[] = [];

  return <ServiceAreasClient serviceAreas={serviceAreas} />;
}
