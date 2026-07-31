/**
 * Magic-byte image sniffing for server-side upload routes.
 *
 * Extracted from `app/api/assessments/walkthrough/route.ts` (SEC-002 hardening)
 * so every route that accepts an uploaded image can reject non-images rather
 * than stamping arbitrary bytes with a forced `image/*` content type. A
 * client-declared MIME header is attacker-controlled; the leading bytes are not.
 */

/**
 * True when the buffer starts with the signature of an image format a phone
 * camera or gallery can realistically produce.
 */
export function isSupportedImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG  FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG   89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return true;
  // WebP  "RIFF"…"WEBP"
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  )
    return true;
  // HEIC/HEIF  …."ftyp"<brand>
  if (
    buf.toString('ascii', 4, 8) === 'ftyp' &&
    ['heic', 'heix', 'hevc', 'heif', 'mif1', 'msf1'].includes(
      buf.toString('ascii', 8, 12)
    )
  )
    return true;
  return false;
}

/**
 * Canonical storage extension + content type for a sniffed buffer.
 *
 * Deliberately derived from the BYTES, not from the filename or the
 * client-supplied MIME: the mobile quick-AI path used to label every
 * non-PNG upload `image/jpeg`, so a HEIC photo was stored as JPEG and
 * downstream vision calls received undecodable bytes under a lying header.
 */
export function imageKindFromBytes(
  buf: Buffer
): { ext: string; contentType: string } | null {
  if (!isSupportedImage(buf)) return null;
  if (buf[0] === 0xff) return { ext: 'jpg', contentType: 'image/jpeg' };
  if (buf[0] === 0x89) return { ext: 'png', contentType: 'image/png' };
  if (buf.toString('ascii', 0, 4) === 'RIFF')
    return { ext: 'webp', contentType: 'image/webp' };
  return { ext: 'heic', contentType: 'image/heic' };
}
