'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { MfaStepUpDialog } from '@/components/auth/MfaStepUpDialog';

type Subject = {
  subjectId: string;
  caseReference: string;
  identityVerified: boolean;
};
type Manifest = {
  subjectId: string;
  fingerprint: string;
  generatedAt: string;
  scope: string;
  records: {
    kind: 'contract' | 'dispute';
    recordId: string;
    archivedAt: string;
  }[];
};
function pause(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cancelled = () => {
      clearTimeout(timer);
      reject(new Error('Export cancelled.'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancelled);
      resolve();
    }, 2100);
    signal.addEventListener('abort', cancelled, { once: true });
    if (signal.aborted) cancelled();
  });
}
export default function AccountEvidenceExport() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [mfa, setMfa] = useState(false);
  const active = useRef<AbortController | null>(null);
  const verification = useRef<{
    resolve: () => void;
    reject: (reason: Error) => void;
  } | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      verification.current?.reject(new Error('Export cancelled.'));
    },
    []
  );
  async function request(
    url: string,
    body: object,
    signal: AbortSignal,
    canVerify = true
  ): Promise<Response> {
    const response = await fetchWithCsrf(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (response.ok) return response;
    const data = await response.json();
    if (canVerify && response.status === 403 && data.requiresStepUp) {
      setMfa(true);
      await new Promise<void>((resolve, reject) => {
        verification.current = { resolve, reject };
      });
      if (signal.aborted) throw new Error('Export cancelled.');
      return request(url, body, signal, false);
    }
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : data.error?.message || 'Export unavailable. Please retry.'
    );
  }
  async function collect(subject: Subject) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError('');
    setMessage('');
    setProgress('Finding retained records…');
    try {
      const url = '/api/admin/evidence-retention/export/manifest';
      const manifest: Manifest = await (
        await request(url, subject, controller.signal)
      ).json();
      if (
        manifest.subjectId !== subject.subjectId ||
        !Array.isArray(manifest.records) ||
        typeof manifest.fingerprint !== 'string'
      )
        throw new Error('Inventory could not be verified.');
      const packets: unknown[] = [];
      let bytes = 0;
      let filesComplete = true;
      for (const [index, record] of manifest.records.entries()) {
        if (index) await pause(controller.signal);
        setProgress(
          `Preparing record ${index + 1} of ${manifest.records.length}…`
        );
        const response = await request(
          '/api/admin/evidence-retention/export',
          { ...subject, kind: record.kind, recordId: record.recordId },
          controller.signal
        );
        const text = await response.text();
        bytes += new Blob([text]).size;
        if (bytes > 25_000_000)
          throw new Error(
            'This account needs an offline export. No partial download was created.'
          );
        const packet = JSON.parse(text);
        const key = record.kind === 'contract' ? 'contract_id' : 'dispute_id';
        if (
          packet.record?.[key] !== record.recordId ||
          packet.record?.archived_at !== record.archivedAt
        )
          throw new Error('An archived record changed. Restart the export.');
        filesComplete =
          filesComplete && packet.external_files_complete === true;
        packets.push(packet);
      }
      setProgress('Checking that the inventory has not changed…');
      const check: Manifest = await (
        await request(url, subject, controller.signal)
      ).json();
      if (
        check.fingerprint !== manifest.fingerprint ||
        check.subjectId !== subject.subjectId
      )
        throw new Error(
          'The retained inventory changed during export. Restart to include the current records.'
        );
      if (controller.signal.aborted) return;
      const blob = new Blob(
        [
          JSON.stringify({
            format: 'mintenance-account-retained-evidence-v1',
            subject_id: subject.subjectId,
            case_reference: subject.caseReference,
            manifest,
            inventory_rechecked_at: check.generatedAt,
            retained_records_complete: true,
            external_files_complete: filesComplete,
            requires_privacy_review_before_delivery: true,
            packets,
          }),
        ],
        { type: 'application/json' }
      );
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `retained-account-${subject.subjectId}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setMessage(
        `${packets.length} retained record(s) downloaded for staff review.${filesComplete ? '' : ' Some external files still need reconciliation.'} This excludes other personal-data categories, backups and processor copies.`
      );
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Export unavailable. No partial download was created.'
        );
    } finally {
      active.current = null;
      if (!controller.signal.aborted) {
        setBusy(false);
        setProgress('');
      }
    }
  }
  return (
    <section className='space-y-4 rounded-xl border p-5'>
      <h2 className='text-xl font-semibold'>
        All retained records for an account
      </h2>
      <p>
        Find all retained contracts and disputes, then prepare one review
        packet. Keep this page open. Missing files stop the download; unfamiliar
        references are listed for follow-up. Large exports require offline
        processing.
      </p>
      {error && <p role='alert'>{error}</p>}
      {message && <p role='status'>{message}</p>}
      {busy && <p role='status'>{progress}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          void collect({
            subjectId: String(fields.get('subjectId')).trim(),
            caseReference: String(fields.get('caseReference')).trim(),
            identityVerified: fields.get('identityVerified') === 'on',
          });
        }}
      >
        <fieldset disabled={busy} className='space-y-4'>
          <label className='block'>
            Account to export
            <input
              name='subjectId'
              required
              className='block w-full rounded border p-2'
            />
          </label>
          <label className='block'>
            Account export case reference
            <input
              name='caseReference'
              required
              minLength={5}
              maxLength={100}
              className='block w-full rounded border p-2'
            />
          </label>
          <label className='flex gap-2'>
            <input name='identityVerified' type='checkbox' required />I verified
            this account holder’s identity and authority.
          </label>
          <button type='submit' className='rounded border px-4 py-2'>
            {busy
              ? 'Preparing account export…'
              : 'Download all retained records'}
          </button>
        </fieldset>
      </form>
      {mfa && (
        <MfaStepUpDialog
          onCancel={() => {
            setMfa(false);
            verification.current?.reject(
              new Error('Verification cancelled. No download was created.')
            );
            verification.current = null;
          }}
          onSuccess={() => {
            setMfa(false);
            verification.current?.resolve();
            verification.current = null;
          }}
        />
      )}
    </section>
  );
}
