import InspectionReportView from './report-view';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>;
}) {
  const { id, reportId } = await params;
  return (
    <InspectionReportView
      key={id + reportId}
      propertyId={id}
      reportId={reportId}
    />
  );
}
