import { getCurrentUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ServiceAreasClient } from './components/ServiceAreasClient';
import { createServerSupabaseClient } from '@/lib/api/supabaseServer';

export default async function ServiceAreasPage() {
  const user = await getCurrentUserFromCookies();

  if (!user || user.role !== 'contractor') {
    redirect('/login');
  }

  const serverSupabase = createServerSupabaseClient();

  const { data: areas } = await serverSupabase
    .from('service_areas')
    .select('*')
    .eq('contractor_id', user.id)
    .order('is_active', { ascending: false })
    .order('priority', { ascending: false });

  const serviceAreas = areas?.map(area => ({
    id: area.id,
    location: `${area.city}, ${area.state}`,
    city: area.city,
    state: area.state,
    zipCode: area.zip_code,
    country: area.country,
    radius_km: area.service_radius || 25,
    latitude: area.latitude,
    longitude: area.longitude,
    is_active: area.is_active,
    priority: area.priority,
  })) || [];

  return <ServiceAreasClient serviceAreas={serviceAreas} />;
}
