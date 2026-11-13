/** Keep original filenames out of storage paths, including encoded separators. */
export function createMessageAttachmentPath(filename: string): string {
  const candidate = filename.includes('.') ? filename.split('.').pop() : '';
  const extension =
    candidate && /^[a-z0-9]{1,10}$/i.test(candidate)
      ? candidate.toLowerCase()
      : 'bin';
  return `message-attachments/${crypto.randomUUID()}.${extension}`;
}
