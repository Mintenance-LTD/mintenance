import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ComplianceDashboardClient } from './components/ComplianceDashboardClient';
import { hasFeatureAccess } from '@/lib/feature-access-config';
import { getEffectiveHomeownerTier } from '@/lib/subscription/early-access';
import Link from 'next/link';

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

  // Check subscription tier for compliance dashboard access
  if (user.role === 'homeowner') {
    const tier = await getEffectiveHomeownerTier(user.id);
    const canAccess = hasFeatureAccess('HOMEOWNER_COMPLIANCE_DASHBOARD', 'homeowner', tier);

    if (!canAccess) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center px-4">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">Compliance Dashboard</h1>
            <p className="text-gray-600 mb-2">
              Track gas safety, electrical, EPC and other compliance certificates across your properties.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Available on Landlord and Agency plans.
            </p>
            <Link
              href="/subscription-plans"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
            >
              Upgrade to Landlord
            </Link>
            <div className="mt-4">
              <Link href="/properties" className="text-sm text-gray-500 hover:text-gray-700">
                Back to Properties
              </Link>
            </div>
          </div>
        </div>
      );
    }
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
