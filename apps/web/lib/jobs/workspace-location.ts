import { cleanAddress } from '@/lib/utils/location';

export interface WorkspaceLocation {
  location?: string;
  propertyLabel?: string;
  propertyName?: string;
  propertyTown?: string;
  propertyPostcode?: string;
}

const ukPostcode = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/gi;

export function workspaceLocation(job: WorkspaceLocation) {
  const townAndPostcode = [job.propertyTown, job.propertyPostcode]
    .filter(Boolean)
    .join(', ');
  const place =
    job.propertyName && townAndPostcode
      ? townAndPostcode
      : [job.propertyLabel, townAndPostcode].filter(Boolean).join(', ') ||
        job.location ||
        '';
  // Historic job locations can include both "Town POSTCODE" and the same
  // town/postcode as separate address parts. Normalise before deduping.
  const normalized = place.replace(
    ukPostcode,
    (_, outward: string, inward: string) =>
      `, ${outward.toUpperCase()} ${inward.toUpperCase()}, `
  );
  return cleanAddress(
    [job.propertyName, normalized].filter(Boolean).join(', ')
  );
}

export function matchesWorkspaceSearch(
  job: WorkspaceLocation & { title: string; description?: string },
  query: string
) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const searchable = [
    job.title,
    job.description,
    workspaceLocation(job),
    job.propertyLabel,
    job.location,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return words.every((word) => searchable.includes(word));
}
