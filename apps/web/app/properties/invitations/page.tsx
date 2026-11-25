import { z } from 'zod';
import { OperationsPage } from '@/components/property-operations/OperationsPage';
import { PendingPropertyInvites } from '../components/PendingPropertyInvites';

export default async function PropertyInvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    property?: string | string[];
    report?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const property = z.uuid().safeParse(params.property);
  const report = z.uuid().safeParse(params.report);

  return (
    <OperationsPage
      compact
      title='Property invitations'
      eyebrow='Properties'
      description='Review the property and the access you have been offered before accepting.'
      backHref='/properties'
      backLabel='Back to properties'
    >
      <PendingPropertyInvites
        propertyId={property.data}
        reportId={property.success ? report.data : undefined}
      />
    </OperationsPage>
  );
}
