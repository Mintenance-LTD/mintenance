'use client';
import { useRef, useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
interface DocumentRecord {
  id: string;
  name: string;
  kind: string;
  updated_at: string;
  archived_at: string | null;
}
export function PropertyDocumentActions({
  propertyId,
  document: doc,
  onSaved,
}: {
  propertyId: string;
  document: DocumentRecord;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [name, setName] = useState(doc.name);
  const [kind, setKind] = useState(doc.kind);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  async function save(action: 'edit' | 'archive') {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetchWithCsrf(
        '/api/properties/' + encodeURIComponent(propertyId) + '/documents',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            documentId: doc.id,
            expectedUpdatedAt: doc.updated_at,
            ...(action === 'edit'
              ? { name: name.trim(), kind }
              : { archived: !doc.archived_at }),
          }),
        }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.document?.id !== doc.id)
        throw new Error(
          typeof body?.error === 'string'
            ? body.error
            : (body?.error?.message ??
                'Document update could not be confirmed. Refresh before retrying.')
        );
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to update document.'
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <div className='space-y-3 py-3'>
      <p className='text-sm'>
        Edit the file’s display details or archive it from the active list. The
        stored file contents remain unchanged. Signed agreements and inspection
        reports are managed separately.
      </p>
      <div className='flex gap-3'>
        <button
          disabled={busy}
          className='underline'
          onClick={() => setEditing((v) => !v)}
        >
          Rename or change type
        </button>
        <button
          disabled={busy}
          className='underline'
          onClick={() =>
            doc.archived_at ? void save('archive') : setArchiveConfirm(true)
          }
        >
          {doc.archived_at ? 'Restore file' : 'Archive file'}
        </button>
      </div>
      {editing && (
        <form
          className='space-y-2'
          onSubmit={(e) => {
            e.preventDefault();
            void save('edit');
          }}
        >
          <label className='block'>
            Document name
            <input
              className='field w-full'
              required
              maxLength={200}
              value={name}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className='block'>
            Document type
            <select
              className='field w-full'
              value={kind}
              disabled={busy}
              onChange={(e) => setKind(e.target.value)}
            >
              {[
                'lease',
                'inspection',
                'warranty',
                'invoice',
                'certificate',
                'other',
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <button className='pw-btn' disabled={busy || !name.trim()}>
            Save document details
          </button>
        </form>
      )}
      {archiveConfirm && !doc.archived_at && (
        <div>
          <p>
            Archive “{doc.name}”? You can restore it from Show archived files.
          </p>
          <button
            className='pw-btn'
            disabled={busy}
            onClick={() => void save('archive')}
          >
            Confirm archive
          </button>
          <button disabled={busy} onClick={() => setArchiveConfirm(false)}>
            Keep file active
          </button>
        </div>
      )}
      {error && <p role='alert'>{error}</p>}
    </div>
  );
}
