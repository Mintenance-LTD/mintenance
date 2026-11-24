export const INSPECTION_KINDS = [
  { value: 'check_in', label: 'Check-in' },
  { value: 'routine', label: 'Routine inspection' },
  { value: 'check_out', label: 'Check-out' },
] as const;
export type InspectionKind = (typeof INSPECTION_KINDS)[number]['value'];
export interface TenancyFolder {
  revision: number;
  id: string;
  label: string;
  starts_on: string;
  ends_on: string | null;
  created_at: string;
}
export interface InspectionReport {
  id: string;
  folder_id: string;
  title: string;
  kind: InspectionKind;
  inspected_on: string;
  notes: string;
  created_at: string;
  tenancy_starts_on?: string | null;
  tenancy_ends_on?: string | null;
  date_exception_reason?: string | null;
  corrects_report_id?: string | null;
  corrected_by_report_id?: string | null;
}
export interface InspectionPhoto {
  id: string;
  room_type: string;
  file_name: string;
  uploaded_at: string | null;
  available: boolean;
  source_photo_id?: string | null;
}
export interface InspectionDetail {
  report: InspectionReport;
  folder: TenancyFolder;
  photos: InspectionPhoto[];
  canCreate?: boolean;
  checkIn?: Pick<
    InspectionReport,
    'id' | 'title' | 'inspected_on' | 'notes'
  > | null;
}
export function isOutsideTenancy(
  inspectedOn: string,
  startsOn: string,
  endsOn: string | null
): boolean {
  return (
    !!inspectedOn &&
    (inspectedOn < startsOn || (!!endsOn && inspectedOn > endsOn))
  );
}
export interface InspectionPage<T> {
  items: T[];
  hasMore: boolean;
  canCreate: boolean;
}
export function isInspectionDate(value: string): boolean {
  if (value.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value >= '1900-01-01'
  );
}
export function inspectionReportPath(
  propertyId: string,
  reportId: string
): string {
  return (
    '/properties/' +
    encodeURIComponent(propertyId) +
    '/inspections/' +
    encodeURIComponent(reportId)
  );
}
