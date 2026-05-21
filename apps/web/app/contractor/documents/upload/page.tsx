'use client';

/**
 * /contractor/documents/upload — "Add to your library" page.
 *
 * Spec source: redesign-v2/documents-web.html (Contractor · Upload
 * screen). Replaces the legacy UploadModal with a proper page so the
 * contractor gets a real dropzone, an upload queue with per-file
 * progress, and a sidebar with category chips + optional job link +
 * visibility explainer.
 *
 * Controller stays here; UI primitives live in ./components/.
 */

import React, { useCallback, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfToken } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';
import { UploadDropzone } from './components/UploadDropzone';
import { UploadQueue, type QueueItem } from './components/UploadQueue';
import { UploadSidebar } from './components/UploadSidebar';

const ACCEPTED_EXTS = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.zip,.xls,.xlsx';
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB per spec

export default function ContractorUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedJobIdParam = searchParams.get('jobId');
  const linkedJobName = searchParams.get('jobName');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [category, setCategory] = useState<string>('contracts');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [linkedJobId, setLinkedJobId] = useState<string | null>(
    linkedJobIdParam
  );

  const enqueue = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    const next: QueueItem[] = [];
    for (const file of list) {
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} is over 25MB`);
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: 'queued',
      });
    }
    if (next.length > 0) {
      setQueue((prev) => [...prev, ...next]);
    }
  }, []);

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) enqueue(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalToUpload = queue.filter((q) => q.status !== 'done').length;

  const handleUpload = async () => {
    if (totalToUpload === 0 || uploading) return;
    setUploading(true);
    const csrf = await getCsrfToken();
    let uploaded = 0;

    for (const item of queue) {
      if (item.status === 'done') continue;
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q))
      );
      try {
        const fd = new FormData();
        fd.append('file', item.file);
        fd.append('category', category);
        if (linkedJobId) fd.append('job_id', linkedJobId);
        const res = await fetch('/api/contractor/documents', {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrf },
          body: fd,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data?.error || data?.message || `Upload failed (${res.status})`
          );
        }
        uploaded += 1;
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'done', progress: 100 } : q
          )
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Upload failed';
        logger.error('contractor upload failed', e, {
          service: 'ui',
          fileName: item.file.name,
        });
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'error', error: message } : q
          )
        );
        toast.error(`${item.file.name}: ${message}`);
      }
    }

    setUploading(false);
    if (uploaded > 0) {
      toast.success(
        `${uploaded} file${uploaded === 1 ? '' : 's'} uploaded to your library`
      );
      setTimeout(() => router.push('/contractor/documents'), 600);
    }
  };

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
      <div
        style={{
          fontSize: 12,
          color: 'var(--me-ink-3)',
          marginBottom: 14,
        }}
      >
        <Link
          href='/contractor/dashboard-enhanced'
          style={{ color: 'var(--me-ink-3)', textDecoration: 'none' }}
        >
          Business
        </Link>
        {' / '}
        <Link
          href='/contractor/documents'
          style={{ color: 'var(--me-ink-3)', textDecoration: 'none' }}
        >
          Documents
        </Link>
        {' / '}
        <b style={{ color: 'var(--me-ink)', fontWeight: 500 }}>Upload</b>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Link
          href='/contractor/documents'
          className='btn btn-ghost btn-sm'
          style={{ marginBottom: 8 }}
        >
          <ArrowLeft size={14} strokeWidth={1.75} /> Back to library
        </Link>
        <h1
          className='t-h1'
          style={{ fontSize: 36, lineHeight: 1.05, margin: '4px 0 6px' }}
        >
          Add to your library
        </h1>
        <p
          className='t-body'
          style={{ margin: 0, color: 'var(--me-ink-3)', fontSize: 13 }}
        >
          Stored encrypted · only visible to you and (optionally) the customer
          of a linked job.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        <div>
          <UploadDropzone
            fileInputRef={fileInputRef}
            onPickFiles={onPickFiles}
            onDropFiles={enqueue}
            acceptedExts={ACCEPTED_EXTS}
          />
          <UploadQueue queue={queue} onRemove={removeFromQueue} />
        </div>

        <UploadSidebar
          category={category}
          onCategoryChange={setCategory}
          linkedJobId={linkedJobId}
          linkedJobName={linkedJobName}
          onClearLinkedJob={() => setLinkedJobId(null)}
          totalToUpload={totalToUpload}
          uploading={uploading}
          onUpload={handleUpload}
          onCancel={() => router.push('/contractor/documents')}
        />
      </div>
    </div>
  );
}
