'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfToken } from '@/lib/csrf-client';
import { safeCopyToClipboard } from '@/lib/utils/clipboard';
import { ReportingLinkCoverage } from '@/app/landlord/reporting-links/ReportingLinkCoverage';

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
  const [phone, setPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [hasFallback, setHasFallback] = useState<boolean | null>(null);
  const [savingPhone, setSavingPhone] = useState(false);
  const phoneInputId = `tenant-emergency-phone-${propertyId}`;
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
      const contact = data.emergency_phone ?? '';
      setPhone(contact);
      setSavedPhone(contact);
      setHasFallback(data.has_emergency_fallback ?? null);
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

  const saveEmergencyPhone = async () => {
    if (mutationPending.current) return;
    mutationPending.current = true;
    setSavingPhone(true);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/properties/${propertyId}/report-token`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ emergency_phone: phone.trim() || null }),
      });
      const body = await res.json();
      if (
        !res.ok ||
        !(
          body.emergency_phone === null ||
          typeof body.emergency_phone === 'string'
        )
      ) {
        toast.error(
          res.status === 400
            ? 'Enter a valid phone number.'
            : 'Emergency contact could not be saved.'
        );
        return;
      }
      setPhone(body.emergency_phone ?? '');
      setSavedPhone(body.emergency_phone ?? '');
      toast.success('Emergency contact updated');
    } catch {
      toast.error('Emergency contact could not be saved.');
    } finally {
      mutationPending.current = false;
      setSavingPhone(false);
    }
  };

  const copyReportLink = async (reportToken: string) => {
    if (!reportToken) {
      toast.error('Reporting link unavailable. Reload and retry.');
      return;
    }
    const url = `https://www.mintenance.co.uk/report/${encodeURIComponent(reportToken)}`;
    const ok = await safeCopyToClipboard(url);
    if (ok) {
      toast.success('Link copied to clipboard');
    } else {
      toast.error('Failed to copy. Please copy the link manually.');
    }
  };

  return (
    <div className='card card-pad'>
      <div className='pw-row' style={{ gap: 8, marginBottom: 8 }}>
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
      {!loading && !loadError && (
        <div className='mb-4 space-y-2'>
          <ReportingLinkCoverage
            properties={[{ id: propertyId, property_name: propertyName }]}
            coverage={[
              {
                propertyId,
                hasEmergencyPhone: !!savedPhone,
                hasFallbackResponder: hasFallback,
              },
            ]}
          />
          <label htmlFor={phoneInputId} className='block text-sm font-medium'>
            Emergency contact number
          </label>
          <p id={`${phoneInputId}-help`} className='t-meta'>
            Use a number your team has approved to share with anyone who has an
            active reporting link.
          </p>
          <input
            id={phoneInputId}
            aria-describedby={`${phoneInputId}-help`}
            type='tel'
            maxLength={40}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className='field w-full'
            disabled={savingPhone}
          />
          <button
            type='button'
            className='pw-btn pw-btn-small'
            onClick={() => void saveEmergencyPhone()}
            disabled={
              phone === savedPhone ||
              savingPhone ||
              isGeneratingToken ||
              updating !== null
            }
          >
            {savingPhone ? 'Saving…' : 'Save emergency contact'}
          </button>
        </div>
      )}
      <button
        type='button'
        className='pw-btn pw-btn-primary'
        onClick={handleGenerateReportToken}
        disabled={
          loading ||
          loadError ||
          isGeneratingToken ||
          updating !== null ||
          savingPhone
        }
        style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
      >
        {isGeneratingToken ? 'Generating…' : 'Create reporting link'}
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
        <div className='pw-stack' style={{ gap: 6 }}>
          {reportTokens.map((token) => (
            <div
              key={token.id}
              className='pw-row'
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
                className='pw-btn pw-btn-small'
                aria-label={`Copy ${token.label || 'reporting link'}`}
                style={{ padding: '4px 6px' }}
              >
                <Copy size={15} strokeWidth={1.75} /> Copy link
              </button>
              <button
                type='button'
                disabled={isGeneratingToken || updating !== null || savingPhone}
                onClick={() => handleToggleToken(token.id, token.is_active)}
                className='pw-btn pw-btn-small'
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
