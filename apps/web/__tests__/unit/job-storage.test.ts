/**
 * Unit tests for lib/api/job-storage path-extraction helper.
 *
 * The Job-storage bucket flipped from `public=true` to `public=false`
 * on 2026-04-17 as part of the audit storage-hardening remediation.
 * job_attachments.file_url now accumulates URLs from three eras:
 *
 *   1. Legacy public URL (pre-flip) — `/storage/v1/object/public/...`
 *   2. Signed URL (post-flip) — `/storage/v1/object/sign/...?token=...`
 *   3. Bare object path (some seed fixtures) — `job-photos/...`
 *
 * `extractJobStoragePath` must return the object key for all three so
 * the re-sign-on-read flow can produce a fresh signed URL without
 * migrating the DB rows.
 */
import { describe, it, expect } from 'vitest';
import { extractJobStoragePath } from '../../lib/api/job-storage';

describe('extractJobStoragePath', () => {
  it('extracts path from a legacy public URL', () => {
    const url =
      'https://ukrjudtlvapiajkjbcrd.supabase.co/storage/v1/object/public/Job-storage/job-photos/Rotten_roof_timbers.jpg';
    expect(extractJobStoragePath(url)).toBe(
      'job-photos/Rotten_roof_timbers.jpg'
    );
  });

  it('extracts path from a signed URL and drops the token query string', () => {
    const url =
      'https://ukrjudtlvapiajkjbcrd.supabase.co/storage/v1/object/sign/Job-storage/job-photos/abc.jpeg?token=eyJhbGciOi.J1dHMi&expires=1800';
    expect(extractJobStoragePath(url)).toBe('job-photos/abc.jpeg');
  });

  it('extracts path from a nested jobId/file.jpeg signed URL', () => {
    const url =
      'https://ukrjudtlvapiajkjbcrd.supabase.co/storage/v1/object/sign/Job-storage/c8d55375-cda1-47dd-a56a-ec1072384731/photo.jpeg?token=xyz';
    expect(extractJobStoragePath(url)).toBe(
      'c8d55375-cda1-47dd-a56a-ec1072384731/photo.jpeg'
    );
  });

  it('treats bare object keys as already-extracted paths', () => {
    expect(extractJobStoragePath('job-photos/foo.jpeg')).toBe(
      'job-photos/foo.jpeg'
    );
    expect(extractJobStoragePath('/job-photos/foo.jpeg')).toBe(
      'job-photos/foo.jpeg'
    );
  });

  it('decodes percent-encoded path segments', () => {
    const url =
      'https://ukrjudtlvapiajkjbcrd.supabase.co/storage/v1/object/public/Job-storage/job-photos/my%20photo.jpeg';
    expect(extractJobStoragePath(url)).toBe('job-photos/my photo.jpeg');
  });

  it('returns null for URLs that point at a different bucket', () => {
    // External image — the resign helper should pass these through
    // unchanged rather than trying to sign them as Job-storage keys.
    const url = 'https://cdn.example.com/somewhere/photo.jpg';
    expect(extractJobStoragePath(url)).toBeNull();
  });

  it('returns null for URLs on a different Supabase bucket', () => {
    const url =
      'https://ukrjudtlvapiajkjbcrd.supabase.co/storage/v1/object/public/contractor-documents/doc.pdf';
    expect(extractJobStoragePath(url)).toBeNull();
  });

  it('returns null for empty / missing input', () => {
    expect(extractJobStoragePath('')).toBeNull();
  });
});
