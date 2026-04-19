'use client';

/**
 * CredentialSubmitForm — contractor submits a trade-register credential
 * via POST /api/verification/submit-credential and sees the live status
 * list from GET /api/verification/my-credentials.
 * R4 of docs/RETENTION_ROADMAP_2026.md.
 */

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, Clock, XCircle, ShieldCheck } from 'lucide-react';

interface Credential {
  id: string;
  register: 'gas_safe' | 'niceic' | 'trustmark' | 'other';
  registration_number: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  verified_at: string | null;
  expires_at: string | null;
  rejected_reason: string | null;
  created_at: string;
}

const REGISTER_LABEL: Record<Credential['register'], string> = {
  gas_safe: 'Gas Safe Register',
  niceic: 'NICEIC / ELECSA',
  trustmark: 'TrustMark',
  other: 'Other',
};

function StatusBadge({ status }: { status: Credential['status'] }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3.5 h-3.5" />
        Verified
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3.5 h-3.5" />
        Pending review
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3.5 h-3.5" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
      {status}
    </span>
  );
}

export function CredentialSubmitForm() {
  const [register, setRegister] = useState<Credential['register']>('gas_safe');
  const [number, setNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch('/api/verification/my-credentials', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = (await res.json()) as { credentials: Credential[] };
      setCreds(body.credentials);
    } catch {
      // tolerate silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    if (!number.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/verification/submit-credential', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          register,
          registration_number: number.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `status ${res.status}`);
      if (data.auto_decided && data.status === 'verified') {
        toast.success('Verified — badge is now live on your profile.');
      } else if (data.auto_decided && data.status === 'rejected') {
        toast.error('The register did not recognise that number.');
      } else {
        toast.success('Submitted for manual review — we reply within 2 business days.');
      }
      setNumber('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Add a credential
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <label className="block text-sm sm:col-span-1">
            <span className="text-gray-700 font-medium">Register</span>
            <select
              value={register}
              onChange={(e) =>
                setRegister(e.target.value as Credential['register'])
              }
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="gas_safe">Gas Safe Register</option>
              <option value="niceic">NICEIC / ELECSA</option>
              <option value="trustmark">TrustMark</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-gray-700 font-medium">
              Registration number
            </span>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. 123456"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={submitting || !number.trim()}
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {submitting ? 'Submitting…' : 'Submit for verification'}
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Your credentials
        </h2>
        {loading && (
          <p className="text-sm text-gray-500">Loading…</p>
        )}
        {!loading && creds.length === 0 && (
          <p className="text-sm text-gray-500">
            Nothing submitted yet. Add your first register above.
          </p>
        )}
        <div className="space-y-3">
          {creds.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between gap-4 bg-white border border-gray-200 rounded-xl p-4"
            >
              <div>
                <div className="font-semibold text-gray-900">
                  {REGISTER_LABEL[c.register]}
                </div>
                <div className="text-sm text-gray-600 font-mono mt-1">
                  {c.registration_number}
                </div>
                {c.rejected_reason && (
                  <p className="text-xs text-rose-600 mt-1">
                    {c.rejected_reason}
                  </p>
                )}
                {c.expires_at && c.status === 'verified' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Expires {new Date(c.expires_at).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default CredentialSubmitForm;
