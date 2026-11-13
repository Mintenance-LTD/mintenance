import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMessageAttachmentPath } from '@/lib/utils/message-attachment-path';

const prefix = /^message-attachments\/[0-9a-f-]{36}\./;
// The shared UI setup uses a non-UUID placeholder; exercise real UUID shapes here.
beforeEach(() => {
  vi.spyOn(crypto, 'randomUUID').mockImplementation(randomUUID);
});
afterEach(() => {
  vi.restoreAllMocks();
});
describe('message attachment storage paths', () => {
  it.each(['receipt.PDF', 'photo.jpg', 'invoice.final.xlsx'])(
    'preserves only the safe extension of %s',
    (filename) => {
      const path = createMessageAttachmentPath(filename);
      expect(path).toMatch(prefix);
      expect(path.split('.').pop()).toBe(
        filename.split('.').pop()?.toLowerCase()
      );
      expect(path.split('/')).toHaveLength(2);
    }
  );
  it.each([
    'receipt',
    'file.',
    'file.%2e%2e%2fprivate',
    'file./other',
    'file.\\other',
    'file.pdf?download=1',
    'file.abcdefghijklmnop',
    'file.ＰＤＦ',
  ])('falls back to bin for unsafe extension in %s', (filename) => {
    expect(createMessageAttachmentPath(filename)).toMatch(
      /^message-attachments\/[0-9a-f-]{36}\.bin$/
    );
  });
  it('generates distinct keys for repeated original filenames', () => {
    expect(createMessageAttachmentPath('receipt.pdf')).not.toBe(
      createMessageAttachmentPath('receipt.pdf')
    );
  });
});
