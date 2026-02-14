import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ComplianceDashboardClient } from './components/ComplianceDashboardClient';

export const metadata: Metadata = {
  title: 'Compliance Dashboard | Mintenance',
  description: 'Track gas safety, electrical, EPC and other compliance certificates across your properties.',
};

interface ComplianceCert {
  id: string;
  property_id: string;
  cert_type: string;
  certificate_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  issuer_name: string | null;
  status: string;
  document_url: string | null;
  renewal_job_id: string | null;
}

interface Property {
  id: string;
  property_name: string;
  address: string;
}

export default async function ComplianceDashboardPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/properties/compliance');
  }

  if (user.role !== 'homeowner' && user.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch all properties
  const { data: properties } = await serverSupabase
    .from('properties')
    .select('id, property_name, address')
    .eq('owner_id', user.id)
    .order('is_primary', { ascending: false });

  // Fetch all compliance certificates
  const { data: certificates } = await serverSupabase
    .from('compliance_certificates')
    .select('*')
    .eq('owner_id', user.id)
    .order('expiry_date', { ascending: true });

  const propertyList = (properties || []) as Property[];
  const certList = (certificates || []) as ComplianceCert[];

  // Calculate summary stats
  const now = new Date();
  const totalCerts = certList.length;
  const expiredCount = certList.filter(c => c.status === 'expired').length;
  const expiringCount = certList.filter(c => c.status === 'expiring').length;
  const validCount = certList.filter(c => c.status === 'valid').length;
  const missingCount = propertyList.length * 5 - totalCerts; // 5 core cert types per property

  // Build per-property compliance data
  const CORE_CERT_TYPES = ['gas_safety', 'eicr', 'epc', 'smoke_alarm', 'co_detector'] as const;

  const propertiesWithCompliance = propertyList.map(property => {
    const propertyCerts = certList.filter(c => c.property_id === property.id);
    const certMap: Record<string, ComplianceCert | null> = {};

    for (const type of CORE_CERT_TYPES) {
      certMap[type] = propertyCerts.find(c => c.cert_type === type) || null;
    }

    // Additional certs beyond core 5
    const additionalCerts = propertyCerts.filter(
      c => !CORE_CERT_TYPES.includes(c.cert_type as typeof CORE_CERT_TYPES[number])
    );

    const hasExpired = propertyCerts.some(c => c.status === 'expired');
    const hasExpiring = propertyCerts.some(c => c.status === 'expiring');
    const overallStatus = hasExpired ? 'red' : hasExpiring ? 'amber' : propertyCerts.length >= 5 ? 'green' : 'amber';

    return {
      ...property,
      certMap,
      additionalCerts,
      overallStatus,
      certCount: propertyCerts.length,
    };
  });

  return (
    <ComplianceDashboardClient
      properties={propertiesWithCompliance}
      summary={{
        totalProperties: propertyList.length,
        totalCerts,
        validCount,
        expiringCount,
        expiredCount,
        missingCount: Math.max(0, missingCount),
      }}
    />
  );
}
