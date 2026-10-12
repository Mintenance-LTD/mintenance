import { randomUUID } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { createServiceClient } from '@/test/integration/supabase-test-client';
// Only replace deployment configuration: all Storage calls use the real local service.
vi.mock('@/lib/api/supabaseServer', async () => {
  const { createServiceClient } =
    await import('@/test/integration/supabase-test-client');
  return { serverSupabase: createServiceClient() };
});
import { buildRetainedEvidencePacket } from '@/lib/privacy/retained-evidence-export';

it('embeds durable local file bytes and fails after the synthetic file is removed', async () => {
  const db = createServiceClient();
  const job = randomUUID();
  const subject = randomUUID();
  const path = `${job}/disputes/${subject}/export-diagnostic.png`;
  const bucket = db.storage.from('job-attachments');
  const record = {
    job_id: job,
    claimant_id: subject,
    evidence: { description: `job-attachments:${path}` },
  };
  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1kAAAAASUVORK5CYII=',
    'base64'
  );
  try {
    const uploaded = await bucket.upload(path, bytes, {
      contentType: 'image/png',
    });
    expect(uploaded.error).toBeNull();
    const packet = await buildRetainedEvidencePacket('dispute', record);
    expect(Buffer.from(packet.files[0].content, 'base64')).toEqual(bytes);
    expect(packet.external_files_complete).toBe(true);
    expect((await bucket.remove([path])).error).toBeNull();
    await expect(
      buildRetainedEvidencePacket('dispute', record)
    ).rejects.toThrow('No export was completed');
  } finally {
    const cleanup = await bucket.remove([path]);
    expect(cleanup.error).toBeNull();
  }
});
