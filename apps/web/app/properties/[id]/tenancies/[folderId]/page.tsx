import Link from 'next/link';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import TenancyInspections from '../../components/TenancyInspections';
import '../../components/property-workspace.css';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; folderId: string }>;
}) {
  const { id, folderId } = await params;
  return (
    <HomeownerPageWrapper>
      <div className='property-workspace'>
        <Link
          className='pw-back'
          href={`/properties/${encodeURIComponent(id)}?tab=manage&manage=records`}
        >
          Back to property records
        </Link>
        <TenancyInspections propertyId={id} initialFolderId={folderId} />
      </div>
    </HomeownerPageWrapper>
  );
}
