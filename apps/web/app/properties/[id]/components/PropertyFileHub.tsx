'use client';
import { useEffect, useRef, useState } from 'react';
import {
  FileText,
  FolderOpen,
  Award,
  Users,
  Search,
  Upload,
  Download,
} from 'lucide-react';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { WorkspaceStat, WorkspaceBadge } from './PropertyWorkspacePrimitives';
interface Doc {
  id: string;
  name: string;
  kind: string;
  created_at: string;
}
const KINDS = [
  'lease',
  'inspection',
  'warranty',
  'invoice',
  'certificate',
  'other',
];
const date = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
export function PropertyFileHub({
  propertyId,
  certificateCount = 0,
}: {
  propertyId: string;
  certificateCount?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [rows, setRows] = useState<Doc[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [kind, setKind] = useState('other');
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const url = `/api/properties/${propertyId}/documents`;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setRows([]);
    setHasMore(false);
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
        if (!controller.signal.aborted) {
          setRows(data.documents);
          setHasMore(data.hasMore);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, page, refresh]);
  function chooseFile(next: File | null) {
    setSuccess('');
    if (
      next &&
      (next.size === 0 ||
        next.size > 3145728 ||
        !['application/pdf', 'image/png', 'image/jpeg'].includes(next.type))
    ) {
      setFile(null);
      setError('Choose a PDF, PNG or JPEG up to 3 MB.');
      return;
    }
    setError('');
    setFile(next);
  }
  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
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
      if (inputRef.current) inputRef.current.value = '';
      setPage(0);
      setRefresh((v) => v + 1);
      setSuccess('File uploaded successfully.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }
  async function download(id: string) {
    if (opening) return;
    setOpening(true);
    setError('');
    try {
      const response = await fetch(
        `${url}?documentId=${encodeURIComponent(id)}`,
        { cache: 'no-store' }
      );
      if (!response.ok) throw new Error('Unable to open this file.');
      const data = await response.json();
      window.location.assign(data.url);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to open file'
      );
    } finally {
      setOpening(false);
    }
  }
  const visible = rows.filter(
    (doc) =>
      (filter === 'all' || doc.kind === filter) &&
      doc.name.toLowerCase().includes(query.toLowerCase())
  );
  const selected = visible.find((doc) => doc.id === selectedId) ?? visible[0];
  return (
    <div className='pw-stack'>
      <div className='pw-between pw-page-tools'>
        <p className='pw-muted'>
          Keep your property files and supporting records together.
        </p>
        <button
          className='pw-btn pw-btn-primary'
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={18} />
          Upload file
        </button>
      </div>
      <div className='pw-stats'>
        <WorkspaceStat
          icon={FolderOpen}
          label={hasMore || page > 0 ? 'Files on this page' : 'Property files'}
          value={loading || error ? '—' : rows.length}
        />
        <WorkspaceStat
          icon={Award}
          label='Certificate records'
          value={certificateCount}
        />
        <WorkspaceStat
          icon={Users}
          label='Access'
          value={<span style={{ fontSize: 19 }}>Owners & managers</span>}
        />
      </div>
      {error && (
        <p role='alert' className='pw-notice pw-error'>
          {error}{' '}
          <button
            className='pw-text-button'
            onClick={() => setRefresh((v) => v + 1)}
          >
            Retry loading
          </button>
        </p>
      )}
      {success && (
        <p role='status' className='pw-notice'>
          {success}
        </p>
      )}
      <div className='pw-split'>
        <section className='pw-card pw-stack' aria-label='Property files'>
          <div className='pw-between'>
            <h2>Files</h2>
            <div className='pw-actions'>
              <label className='pw-search'>
                <Search size={18} />
                <input
                  aria-label='Search files on this page'
                  placeholder='Search files…'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                className='pw-field'
                aria-label='Filter file type'
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value='all'>All types</option>
                {KINDS.map((v) => (
                  <option key={v} value={v}>
                    {v[0].toUpperCase() + v.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {loading ? (
            <p role='status'>Loading files…</p>
          ) : (
            <div className='pw-table-wrap'>
              <table className='pw-table'>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((doc) => (
                    <tr key={doc.id} data-selected={selected?.id === doc.id}>
                      <td>
                        <button
                          className='pw-text-button pw-row'
                          onClick={() => setSelectedId(doc.id)}
                          aria-label={`Details for ${doc.name}`}
                        >
                          <FileText size={22} />
                          {doc.name}
                        </button>
                      </td>
                      <td>
                        <WorkspaceBadge>{doc.kind}</WorkspaceBadge>
                      </td>
                      <td>{date(doc.created_at)}</td>
                      <td>
                        <button
                          className='pw-btn pw-btn-small'
                          disabled={opening}
                          onClick={() => void download(doc.id)}
                          aria-label={`Download ${doc.name}`}
                        >
                          <Download size={16} />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && visible.length === 0 && (
            <div className='pw-empty'>
              <FolderOpen size={32} />
              <h3>
                {rows.length ? 'No matching files' : 'No property files yet'}
              </h3>
              <p>
                {rows.length
                  ? 'Try a different name or type.'
                  : 'Upload a lease, inspection report or warranty to get started.'}
              </p>
            </div>
          )}
          <label
            className='pw-drop'
            data-dragging={dragging}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!busy) chooseFile(e.dataTransfer.files[0] ?? null);
            }}
          >
            <span className='pw-icon'>
              <Upload size={25} />
            </span>
            <strong>
              {file ? file.name : 'Drop a file here, or browse files'}
            </strong>
            <span className='pw-muted'>PDF, PNG or JPEG · Up to 3 MB each</span>
            <input
              ref={inputRef}
              className='sr-only'
              type='file'
              aria-label='Choose file'
              accept='.pdf,.png,.jpg,.jpeg'
              disabled={busy}
              onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              style={{ maxWidth: '100%' }}
            />
          </label>
          {file && (
            <form onSubmit={upload} className='pw-between'>
              <label className='pw-label'>
                Document type
                <select
                  className='pw-field'
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  disabled={busy}
                >
                  {KINDS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <button className='pw-btn pw-btn-primary' disabled={busy}>
                {busy ? 'Uploading…' : 'Upload selected file'}
              </button>
            </form>
          )}
          {(page > 0 || hasMore) && (
            <div className='pw-between pw-footer'>
              <span>
                Page {page + 1} · Search and filters apply to this page
              </span>
              <div className='pw-actions'>
                <button
                  className='pw-btn pw-btn-small'
                  disabled={page === 0 || loading}
                  onClick={() => setPage((v) => v - 1)}
                >
                  Previous
                </button>
                <button
                  className='pw-btn pw-btn-small'
                  disabled={!hasMore || loading}
                  onClick={() => setPage((v) => v + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
        <aside className='pw-card'>
          <h2>File details</h2>
          {selected && !loading && !error ? (
            <>
              <div className='pw-row'>
                <span className='pw-icon'>
                  <FileText size={26} />
                </span>
                <div style={{ overflowWrap: 'anywhere' }}>
                  <strong>{selected.name}</strong>
                  <div>
                    <WorkspaceBadge>{selected.kind}</WorkspaceBadge>
                  </div>
                </div>
              </div>
              <dl className='pw-details'>
                <div>
                  <dt>Uploaded</dt>
                  <dd>{date(selected.created_at)}</dd>
                </div>
                <div>
                  <dt>Visibility</dt>
                  <dd>Owners & managers</dd>
                </div>
              </dl>
              <button
                className='pw-btn pw-btn-primary'
                style={{ width: '100%' }}
                disabled={opening}
                onClick={() => void download(selected.id)}
              >
                <Download size={18} />
                {opening ? 'Opening…' : 'Download document'}
              </button>
            </>
          ) : (
            <p className='pw-muted'>Select a file to see its details.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
