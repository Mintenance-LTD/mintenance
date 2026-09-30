'use client';
import { useEffect, useState } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';
interface Doc {
  id: string;
  name: string;
  kind: string;
  created_at: string;
}
export function PropertyFileHub({ propertyId }: { propertyId: string }) {
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [rows, setRows] = useState<Doc[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [kind, setKind] = useState('other');
  const [file, setFile] = useState<File | null>(null);
  const url = `/api/properties/${propertyId}/documents`;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`${url}?offset=${page * 25}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            'Unable to load files. Owners and managers can access this section.'
          );
        return response.json();
      })
      .then((data) => {
        setRows(data.documents);
        setHasMore(data.hasMore);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, page, refresh]);
  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('kind', kind);
      const response = await fetch(url, {
        method: 'POST',
        headers: await getCsrfHeaders(),
        body,
      });
      if (!response.ok)
        throw new Error(
          'Upload failed. Choose a PDF, PNG or JPEG up to 3 MB, then retry.'
        );
      setFile(null);
      setPage(0);
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }
  async function download(id: string) {
    setError('');
    try {
      const response = await fetch(`${url}?documentId=${id}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Unable to open this file.');
      const data = await response.json();
      window.location.assign(data.url);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to open file'
      );
    }
  }
  return (
    <section className='card card-pad space-y-4'>
      <h2 className='text-xl font-semibold'>Property files</h2>
      <p>
        Private files for property owners and managers. PDF, PNG or JPEG, up to
        3 MB.
      </p>
      {error && (
        <p role='alert'>
          {error}{' '}
          <button
            className='underline'
            onClick={() => setRefresh((value) => value + 1)}
          >
            Retry loading
          </button>
        </p>
      )}
      <form onSubmit={upload} className='flex flex-wrap gap-3'>
        <label>
          Document type{' '}
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            disabled={busy}
          >
            {[
              'lease',
              'inspection',
              'warranty',
              'invoice',
              'certificate',
              'other',
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Choose file{' '}
          <input
            type='file'
            accept='.pdf,.png,.jpg,.jpeg'
            disabled={busy}
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>
        <button className='btn btn-primary' disabled={!file || busy}>
          {busy ? 'Uploading…' : 'Upload file'}
        </button>
      </form>
      {loading ? (
        <p role='status'>Loading files…</p>
      ) : (
        <ul>
          {rows.map((doc) => (
            <li key={doc.id} className='border-b py-3'>
              <button
                className='underline'
                onClick={() => void download(doc.id)}
              >
                {doc.name}
              </button>
              <p>
                {doc.kind} ·{' '}
                {new Date(doc.created_at).toLocaleDateString('en-GB')}
              </p>
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && rows.length === 0 && (
        <p>No uploaded files on this page.</p>
      )}
      <div className='flex gap-4'>
        <button
          disabled={page === 0 || loading}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </button>
        <button
          disabled={!hasMore || loading}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
