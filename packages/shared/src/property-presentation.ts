/** Presentation preferences only. Never use these values to authorize an operation. */
export const PROPERTY_VIEWS = [
  {
    value: 'home',
    label: 'My home',
    description: 'Everyday repairs, photos and records.',
  },
  {
    value: 'rentals',
    label: 'Rentals',
    description: 'Tenant reporting, contacts and maintenance.',
  },
  {
    value: 'agency',
    label: 'Agency',
    description: 'Portfolio tools and property teams.',
  },
] as const;
export type PropertyView = (typeof PROPERTY_VIEWS)[number]['value'];
export function parsePropertyView(value: unknown): PropertyView {
  return value === 'rentals' || value === 'agency' ? value : 'home';
}
export function propertyViewKey(userId: string) {
  return `mintenance:property-view:v1:${userId}`;
}
export function showPropertyTool(view: PropertyView, tool: 'rental' | 'team') {
  return tool === 'team' ? view === 'agency' : view !== 'home';
}

export const ROOM_PHOTO_TYPES = [
  ['kitchen', 'Kitchen'],
  ['bathroom', 'Bathroom'],
  ['bedroom', 'Bedroom'],
  ['living_room', 'Living room'],
  ['dining_room', 'Dining room'],
  ['garage', 'Garage'],
  ['garden', 'Garden'],
  ['exterior', 'Exterior'],
  ['roof', 'Roof'],
  ['hallway', 'Hallway'],
  ['office', 'Office'],
  ['utility', 'Utility'],
  ['other', 'Other'],
].map(([value, label]) => ({ value, label }));

export interface DatedRoomPhoto {
  id: string;
  room_type: string;
  photo_url: string;
  file_name: string;
  created_at: string | null;
}

// UTC is explicit on both platforms: changing device timezone must not move a
// photo to another album. These are upload dates, never inferred capture dates.
function uploadTime(value: string | null): number | null {
  if (!value || !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}
export function uploadedPhotoLabel(value: string | null) {
  const time = uploadTime(value);
  return time === null
    ? 'Upload date unknown'
    : `Uploaded ${new Intl.DateTimeFormat('en-GB', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(time)} UTC`;
}
export function groupRoomPhotoAlbums<T extends DatedRoomPhoto>(
  photos: readonly T[],
  room: string
) {
  const groups = new Map<string, T[]>();
  for (const photo of photos) {
    if (photo.room_type !== room) continue;
    const time = uploadTime(photo.created_at);
    const key =
      time === null ? 'unknown' : new Date(time).toISOString().slice(0, 10);
    const group = groups.get(key) ?? [];
    group.push(photo);
    groups.set(key, group);
  }
  return [...groups]
    .sort(([a], [b]) =>
      a === 'unknown' ? 1 : b === 'unknown' ? -1 : b.localeCompare(a)
    )
    .map(([date, rows]) => ({
      date,
      label:
        date === 'unknown'
          ? 'Upload date unknown'
          : `Uploaded ${new Intl.DateTimeFormat('en-GB', {
              timeZone: 'UTC',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(new Date(`${date}T00:00:00Z`))}`,
      photos: [...rows].sort(
        (a, b) =>
          (uploadTime(b.created_at) ?? 0) - (uploadTime(a.created_at) ?? 0)
      ),
    }));
}

export function propertyNavigationVisible(view: PropertyView, href: string) {
  if (
    view === 'home' &&
    (href.startsWith('/landlord/') ||
      [
        '/properties/compliance',
        '/properties/work-queue',
        '/financials',
      ].includes(href))
  )
    return false;
  return view === 'agency' || href !== '/landlord/analytics/year-over-year';
}
