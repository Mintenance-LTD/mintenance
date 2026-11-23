import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { PropertyDocumentView } from './document-view';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; documentId: string }>;
}) {
  const { id, documentId } = await params;
  return (
    <HomeownerPageWrapper>
      <PropertyDocumentView
        key={`${id}/${documentId}`}
        propertyId={id}
        documentId={documentId}
      />
    </HomeownerPageWrapper>
  );
}
