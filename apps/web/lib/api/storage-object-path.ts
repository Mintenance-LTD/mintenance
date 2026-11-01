/** Reject ambiguous keys before the Storage SDK turns them into request URLs. */
function objectPathParts(path: unknown): string[] | null {
  if (typeof path !== 'string' || /[%\\\x00-\x1f\x7f?#]/.test(path))
    return null;
  const parts = path.split('/');
  return parts.every((part) => part !== '' && part !== '.' && part !== '..')
    ? parts
    : null;
}

// Row ownership alone is insufficient: contractors can edit their own metadata
// through the Data API, including a reference to someone else's storage object.
export function isOwnedDocumentPath(
  path: unknown,
  userId: string
): path is string {
  const parts = objectPathParts(path);
  return !!parts && parts.length >= 2 && parts[0] === userId;
}

// Room photos are stored under property-room-photos/<uploader>/<property>/... .
// Authorize the property separately; team members may read/remove each other's
// uploads, so the uploader must not be compared with the current viewer.
export function isPropertyRoomPhotoPath(
  path: unknown,
  propertyId: string
): path is string {
  const parts = objectPathParts(path);
  return (
    !!parts &&
    parts.length >= 4 &&
    parts[0] === 'property-room-photos' &&
    parts[2] === propertyId
  );
}

// Before/after uploads use job-photos/<job>/...; older uploads use <job>/... .
// Metadata rows are editable independently of the referenced Storage object.
export function isJobPhotoPath(path: unknown, jobId: string): path is string {
  const parts = objectPathParts(path);
  return (
    !!parts &&
    ((parts.length >= 3 && parts[0] === 'job-photos' && parts[1] === jobId) ||
      (parts.length >= 2 && parts[0] === jobId))
  );
}

/**
 * Profile URLs are user-editable metadata, not proof of object ownership.
 * Only accept public URLs and the owner-scoped filenames our upload routes
 * generate. Check the raw path so URL parsing cannot normalize traversal.
 * Unknown/legacy URL formats are left in storage rather than deleted with
 * service-role privileges.
 */
export function ownedProfileImagePath(
  value: unknown,
  userId: string,
  kind: 'avatar' | 'cover' | 'profile'
): string | null {
  if (typeof value !== 'string' || !userId) return null;
  let origin: string;
  try {
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    if (!['https:', 'http:'].includes(base.protocol)) return null;
    origin = base.origin;
  } catch {
    return null;
  }
  const bucket = kind === 'avatar' ? 'avatars' : 'profile-images';
  const urlPrefix = `${origin}/storage/v1/object/public/${bucket}/`;
  if (!value.startsWith(urlPrefix)) return null;
  const path = value.slice(urlPrefix.length);
  if (!objectPathParts(path)) return null;
  const prefixes =
    kind === 'avatar'
      ? [`${userId}-`]
      : kind === 'cover'
        ? [`cover-${userId}-`]
        : [`avatars/${userId}-`, `selfies/${userId}-`];
  return prefixes.some(
    (prefix) =>
      path.startsWith(prefix) &&
      /^\d+\.(?:jpe?g|png|webp)$/.test(path.slice(prefix.length))
  )
    ? path
    : null;
}
