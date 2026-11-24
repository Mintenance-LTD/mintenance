'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatMoney } from '@/lib/utils/currency';
import {
  TERMS_HIDDEN_KEYS,
  formatDateTime,
} from '@/app/jobs/[id]/components/contract/contractHelpers';
import type { Document } from './types';

interface Agreement {
  id: string;
  job_id: string | null;
  description?: string | null;
  amount: number;
  status: string;
  contractor_signed_at?: string | null;
  homeowner_signed_at?: string | null;
  terms?: Record<string, unknown> | null;
  quote?: { terms?: string | null } | null;
}

export async function downloadContractPdf(id: string, name: string) {
  const response = await fetch(`/api/contracts/${encodeURIComponent(id)}/pdf`);
  if (
    !response.ok ||
    !response.headers.get('content-type')?.startsWith('application/pdf')
  ) {
    throw new Error('Contract PDF is unavailable');
  }
  const pdf = await response.blob();
  if ((await pdf.slice(0, 5).text()) !== '%PDF-') {
    throw new Error('Contract PDF is invalid');
  }
  const url = URL.createObjectURL(pdf);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const signature = (value?: string | null) =>
  value ? `Signed ${formatDateTime(value)}` : 'Awaiting signature';

export function ContractPreview({
  id,
  document,
  onClose,
}: {
  id: string;
  document: Document;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);
  const {
    data: agreement,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['contractor', 'contract-preview', id],
    queryFn: async ({ signal }): Promise<Agreement> => {
      const response = await fetch(
        `/api/contracts?${new URLSearchParams({ contract_id: id })}`,
        { signal }
      );
      if (!response.ok) throw new Error('Contract is unavailable');
      const result = await response.json();
      const record = result.contracts?.find(
        (contract: Agreement) => contract.id === id
      );
      if (!record) throw new Error('Contract is unavailable');
      return record;
    },
    retry: false,
  });
  const terms = Object.entries(agreement?.terms ?? {}).filter(
    ([key]) => !TERMS_HIDDEN_KEYS.includes(key)
  );

  async function download() {
    if (downloading) return;
    setDownloading(true);
    setFailed(false);
    try {
      await downloadContractPdf(id, document.name);
    } catch {
      setFailed(true);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className='max-h-[85vh] overflow-y-auto'>
        <DialogTitle>{document.name}</DialogTitle>
        <DialogDescription>
          Agreement #{id.slice(0, 8).toUpperCase()}
        </DialogDescription>
        {isPending && <p role='status'>Loading agreement…</p>}
        {isError && (
          <p role='alert'>
            Could not load this agreement.{' '}
            <button
              type='button'
              className='underline'
              onClick={() => void refetch()}
            >
              Retry preview
            </button>
          </p>
        )}
        {agreement && (
          <div className='space-y-3'>
            <dl className='grid grid-cols-2 gap-3 text-sm'>
              <div>
                <dt className='font-semibold'>Agreement status</dt>
                <dd className='capitalize'>
                  {agreement.status === 'accepted'
                    ? 'Signed'
                    : agreement.status.replace(/_/g, ' ')}
                </dd>
              </div>
              <div>
                <dt className='font-semibold'>Agreed total</dt>
                <dd>{formatMoney(Number(agreement.amount), 'GBP')}</dd>
              </div>
              <div>
                <dt className='font-semibold'>Homeowner</dt>
                <dd>{signature(agreement.homeowner_signed_at)}</dd>
              </div>
              <div>
                <dt className='font-semibold'>Contractor</dt>
                <dd>{signature(agreement.contractor_signed_at)}</dd>
              </div>
            </dl>
            {agreement.description && (
              <section>
                <h3 className='font-semibold'>Scope of work</h3>
                <p className='whitespace-pre-wrap text-sm'>
                  {agreement.description}
                </p>
              </section>
            )}
            {agreement.quote?.terms && (
              <section>
                <h3 className='font-semibold'>Quote terms</h3>
                <p className='whitespace-pre-wrap text-sm'>
                  {agreement.quote.terms}
                </p>
              </section>
            )}
            {terms.length > 0 && (
              <section>
                <h3 className='font-semibold'>Additional terms</h3>
                <dl className='space-y-2 text-sm'>
                  {terms.map(([key, value]) => (
                    <div key={key}>
                      <dt className='font-medium capitalize'>
                        {key.replace(/_/g, ' ')}
                      </dt>
                      <dd className='whitespace-pre-wrap break-words'>
                        {typeof value === 'string'
                          ? value
                          : JSON.stringify(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        )}
        <div className='flex flex-wrap gap-4'>
          {(agreement?.job_id ?? document.job_id) && (
            <Link
              href={`/contractor/jobs/${agreement?.job_id ?? document.job_id}`}
              className='font-semibold underline'
            >
              View job
            </Link>
          )}
          <button
            type='button'
            className='font-semibold underline'
            disabled={downloading}
            onClick={() => void download()}
          >
            {downloading
              ? 'Preparing PDF…'
              : failed
                ? 'Retry PDF download'
                : 'Download PDF'}
          </button>
        </div>
        {failed && (
          <p role='alert'>
            Could not download this PDF. Try again from this preview.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
