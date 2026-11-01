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
