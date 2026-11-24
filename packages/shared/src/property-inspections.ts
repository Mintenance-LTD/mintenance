export const INSPECTION_KINDS = [
  { value: 'check_in', label: 'Check-in' },
  { value: 'routine', label: 'Routine inspection' },
  { value: 'check_out', label: 'Check-out' },
] as const;
export type InspectionKind = (typeof INSPECTION_KINDS)[number]['value'];
export type InspectionOutcome = 'no_issues_found' | 'evidence_free';
export interface TenancyFolder {
  revision: number;
  id: string;
  label: string;
  starts_on: string;
  ends_on: string | null;
  created_at: string;
  check_out_recorded?: boolean;
}
export interface TenancyOverlap {
  token: string;
  count: number;
  folders: Pick<TenancyFolder, 'id' | 'label' | 'starts_on' | 'ends_on'>[];
}
export function readTenancyOverlap(input: unknown): TenancyOverlap | null {
  if (!input || typeof input !== 'object') return null;
  const { token, count, folders } = input as Partial<TenancyOverlap>;
  if (
    typeof token !== 'string' ||
    !/^[0-9a-f]{32}$/.test(token) ||
    typeof count !== 'number' ||
    !Number.isInteger(count) ||
    !Array.isArray(folders) ||
    !folders.length ||
    folders.length > count
  )
    return null;
  if (
    !folders.every(
      (folder) =>
        folder &&
        typeof folder.id === 'string' &&
        typeof folder.label === 'string' &&
        typeof folder.starts_on === 'string' &&
        isInspectionDate(folder.starts_on) &&
        (folder.ends_on === null ||
          (typeof folder.ends_on === 'string' &&
            isInspectionDate(folder.ends_on)))
    )
  )
    return null;
  return { token, count, folders };
}
export interface InspectionReport {
  id: string;
  folder_id: string;
  title: string;
  kind: InspectionKind;
  inspected_on: string;
  notes: string;
  created_at: string;
  outcome?: InspectionOutcome | null;
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
  draftScope?: string;
}
const tenancyDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const ukToday = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/London',
});
export function formatTenancyDate(isoDate: string): string {
  return tenancyDate.format(new Date(isoDate + 'T00:00:00Z'));
}
export function tenancyPeriodLabel(
  startsOn: string,
  endsOn: string | null
): string {
  return endsOn
    ? formatTenancyDate(startsOn) + ' to ' + formatTenancyDate(endsOn)
    : 'From ' + formatTenancyDate(startsOn) + ' · No end date';
}
export function tenancyStatus(
  folder: Pick<TenancyFolder, 'starts_on' | 'ends_on'>,
  now = new Date()
): 'Upcoming' | 'Active' | 'Ended' {
  const [day, month, year] = ukToday.format(now).split('/');
  const today = year + '-' + month + '-' + day;
  if (folder.starts_on > today) return 'Upcoming';
  if (folder.ends_on && folder.ends_on < today) return 'Ended';
  return 'Active';
}
export function uploadedBeforeTenancy(
  timestamp: string | null,
  startsOn: string
): boolean {
  if (!timestamp) return false;
  // The picker labels upload dates in UTC.
  const uploadedAt = Date.parse(timestamp);
  return (
    Number.isFinite(uploadedAt) &&
    uploadedAt < Date.parse(startsOn + 'T00:00:00Z')
  );
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
