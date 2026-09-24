'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfToken } from '@/lib/csrf-client';
import { safeCopyToClipboard } from '@/lib/utils/clipboard';

interface ReportToken {
  id: string;
  token: string;
  property_id: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

export function TenantReportingCard({
  propertyId,
  propertyName,
}: {
  propertyId: string;
  propertyName: string;
}) {
  const [reportTokens, setReportTokens] = useState<ReportToken[]>([]);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const mutationPending = useRef(false);

  const fetchReportTokens = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/properties/${propertyId}/report-token`);
      if (!res.ok) throw new Error('Failed to load reporting links');
      const data = await res.json();
      if (!Array.isArray(data.tokens))
        throw new Error('Incomplete reporting links');
      setReportTokens(data.tokens);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchReportTokens();
  }, [fetchReportTokens]);

  const handleGenerateReportToken = async () => {
    if (mutationPending.current) return;
    mutationPending.current = true;
    setIsGeneratingToken(true);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/properties/${propertyId}/report-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ label: `Report link for ${propertyName}` }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.token?.id || data.token.property_id !== propertyId)
          throw new Error('Incomplete reporting link');
        setReportTokens((prev) => [data.token, ...prev]);
        toast.success('Report link generated');
      } else {
        toast.error('Failed to generate report link');
      }
    } catch {
      toast.error('Failed to generate report link');
    } finally {
      mutationPending.current = false;
      setIsGeneratingToken(false);
    }
  };

  const handleToggleToken = async (tokenId: string, isActive: boolean) => {
    if (mutationPending.current) return;
    mutationPending.current = true;
    setUpdating(tokenId);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/properties/${propertyId}/report-token`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ token_id: tokenId, is_active: !isActive }),
      });
      if (!res.ok) throw new Error('Failed to update link');
      const data = await res.json();
      if (
        data.token?.id !== tokenId ||
        data.token.property_id !== propertyId ||
        data.token.is_active !== !isActive
      )
        throw new Error('Incomplete link update');
      {
        setReportTokens((prev) =>
          prev.map((t) =>
            t.id === tokenId ? { ...t, is_active: !isActive } : t
          )
        );
        toast.success(isActive ? 'Link deactivated' : 'Link activated');
      }
    } catch {
      toast.error('Failed to update link');
    } finally {
      mutationPending.current = false;
      setUpdating(null);
    }
  };

  const copyReportLink = async (reportToken: string) => {
    if (!reportToken) {
      toast.error('Reporting link unavailable. Reload and retry.');
      return;
    }
    const url = `${window.location.origin}/report/${encodeURIComponent(reportToken)}`;
    const ok = await safeCopyToClipboard(url);
    if (ok) {
      toast.success('Link copied to clipboard');
    } else {
      toast.error('Failed to copy. Please copy the link manually.');
    }
  };

  return (
    <div className='card card-pad'>
      <div className='row' style={{ gap: 8, marginBottom: 8 }}>
        <Link2
          size={14}
          strokeWidth={1.75}
          style={{ color: 'var(--me-brand)' }}
        />
        <h4 className='t-h4'>Tenant reporting links</h4>
      </div>
      <p className='t-meta' style={{ marginBottom: 12 }}>
        Share a link with tenants so they can report maintenance without needing
        an account.
      </p>
      <button
        type='button'
        className='btn btn-primary btn-sm'
        onClick={handleGenerateReportToken}
        disabled={
          loading || loadError || isGeneratingToken || updating !== null
        }
        style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
      >
        {isGeneratingToken ? 'Generating…' : 'Generate report link'}
      </button>
      {loading && <p role='status'>Loading reporting links…</p>}
      {loadError && (
        <div role='alert'>
          <p>Reporting links could not be loaded.</p>
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            onClick={fetchReportTokens}
          >
            Retry reporting links
          </button>
        </div>
      )}
      {!loading && !loadError && reportTokens.length === 0 && (
        <p>No reporting links yet.</p>
      )}
      {!loadError && reportTokens.length > 0 ? (
        <div className='col' style={{ gap: 6 }}>
          {reportTokens.map((token) => (
            <div
              key={token.id}
              className='row'
              style={{
                gap: 8,
                padding: '8px 10px',
                background: 'var(--me-bg-2)',
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: token.is_active
                    ? 'var(--me-ok-fg)'
                    : 'var(--me-ink-3)',
                }}
              >
                {token.label || 'Tenant report link'} ·{' '}
                {token.is_active ? 'Active' : 'Inactive'}
              </span>
              <div style={{ flex: 1 }} />
              <button
                type='button'
                onClick={() => copyReportLink(token.token)}
                className='btn btn-ghost btn-sm'
                aria-label={`Copy ${token.label || 'reporting link'}`}
                style={{ padding: '4px 6px' }}
              >
                <Copy size={12} strokeWidth={1.75} />
              </button>
              <button
                type='button'
                disabled={isGeneratingToken || updating !== null}
                onClick={() => handleToggleToken(token.id, token.is_active)}
                className='btn btn-ghost btn-sm'
                style={{ padding: '4px 8px', fontSize: 12 }}
              >
                {updating === token.id
                  ? 'Saving…'
                  : token.is_active
                    ? 'Disable'
                    : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
