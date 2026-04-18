'use client';

/**
 * CredentialVerificationQueue — admin UI to approve/reject pending
 * credential submissions. R4 of docs/RETENTION_ROADMAP_2026.md.
 */

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface Row {
  id: string;
  user_id: string;
  register: string;
  registration_number: string;
  status: string;
  rejected_reason: string | null;
  expires_at: string | null;
  created_at: string;
  profile: {
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
}

const REGISTER_LABEL: Record<string, string> = {
  gas_safe: 'Gas Safe',
  niceic: 'NICEIC',
  trustmark: 'TrustMark',
  other: 'Other',
};

export function CredentialVerificationQueue() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/verifications/credentials?status=${filter}&limit=100`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = (await res.json()) as { rows: Row[] };
      setRows(body.rows);
    } catch {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (
    id: string,
    decision: 'verified' | 'rejected'
  ) => {
    const reason =
      decision === 'rejected'
        ? window.prompt('Rejection reason (shown to contractor):') ?? ''
        : '';
    if (decision === 'rejected' && !reason.trim()) return;

    setBusy(id);
    try {
      const res = await fetch('/api/admin/verifications/credentials', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          decision,
          ...(decision === 'rejected' ? { rejected_reason: reason } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `status ${res.status}`);
      toast.success(decision === 'verified' ? 'Marked verified' : 'Marked rejected');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['pending', 'verified', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              filter === f
                ? 'bg-teal-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing in the &ldquo;{filter}&rdquo; queue.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Contractor</th>
                <th className="text-left px-4 py-3">Register</th>
                <th className="text-left px-4 py-3">Number</th>
                <th className="text-left px-4 py-3">Submitted</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {r.profile
                        ? `${r.profile.first_name ?? ''} ${r.profile.last_name ?? ''}`.trim() ||
                          'Contractor'
                        : 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500">{r.profile?.email}</div>
                  </td>
                  <td className="px-4 py-3">{REGISTER_LABEL[r.register] ?? r.register}</td>
                  <td className="px-4 py-3 font-mono">{r.registration_number}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(r.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        r.status === 'verified'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : r.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.rejected_reason && (
                      <div className="text-xs text-gray-500 mt-1">
                        {r.rejected_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'pending' && (
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => decide(r.id, 'verified')}
                          disabled={busy === r.id}
                          className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Verify
                        </button>
                        <button
                          onClick={() => decide(r.id, 'rejected')}
                          disabled={busy === r.id}
                          className="inline-flex items-center gap-1 bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CredentialVerificationQueue;
