/**
 * JobSignOffClient — REMOVED behaviour, kept as inert export.
 *
 * 2026-05-24 audit-33 P1: this component shipped a digital signature
 * pad that, on submit, fetched a base64 signature, attempted a
 * private-bucket upload, and then directly UPDATE'd
 * `jobs SET status='completed'` from the client via the user's
 * supabase JWT — bypassing PaymentEnforcement, the after-photo gate,
 * state-machine validation, idempotency, escrow auto-release
 * scheduling, and every completion notification. The "signature"
 * itself was discarded immediately after the update (no signature_url
 * column was being written to). Net result: a homeowner could mark
 * any of their jobs `completed` with zero server-side checks.
 *
 * The page that hosted this component is now a redirect to
 * /jobs/[id]; this file is kept only so any in-flight imports still
 * compile. The body now throws to make accidental revival loud.
 */
'use client';

import React from 'react';

interface JobSignOffClientProps {
  jobId: string;
  jobTitle: string;
  contractorName: string;
  currentUserRole: string;
}

export function JobSignOffClient(_props: JobSignOffClientProps): null {
  if (process.env.NODE_ENV !== 'production') {
    // Loud-fail in dev so anyone re-mounting this component sees why
    // it's gone. Production callers get a silent no-op render via the
    // page-level redirect.
    throw new Error(
      'JobSignOffClient is deprecated — completion goes through ' +
        '/api/jobs/[id]/photos/after + /api/jobs/[id]/confirm-completion.'
    );
  }
  return null;
}
