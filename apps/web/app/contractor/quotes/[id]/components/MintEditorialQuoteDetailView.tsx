'use client';

/**
 * Mint Editorial port of /contractor/quotes/[id].
 *
 * Replaces the plain Card-stack layout with an editorial spread:
 *   - Serif h1 ("Quote for *{title}*") + status chip + created/valid meta
 *   - Two-column layout: main column (project + items + totals + notes)
 *     and sidebar (client + actions)
 *   - Mint Editorial cards (radius-14, paper shadow) and tokens
 *
 * Renders against the same `Quote` data shape the legacy
 * QuoteDetailsClient uses — same fields, no fabricated stats. Empty
 * states are shown when an optional field is missing rather than
 * inventing placeholders.
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Mail, FileText } from 'lucide-react';

interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice?: number;
  unit_price?: number; // legacy
  total: number;
}

interface Quote {
  id: string;
  quote_number: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_address?: string;
  title: string;
  description?: string;
  line_items: QuoteLineItem[] | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  terms?: string;
  notes?: string;
  quote_date?: string;
  valid_until?: string;
  status: string;
  created_at: string;
}

interface MintEditorialQuoteDetailViewProps {
  quote: Quote;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(value || 0);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

// Status chip — uses Mint Editorial status tones rather than fabricated styling.
function statusChip(status: string) {
  const map: Record<
    string,
    { label: string; bg: string; fg: string }
  > = {
    accepted: {
      label: 'Accepted',
      bg: 'var(--me-ok-bg)',
      fg: 'var(--me-ok-fg)',
    },
    rejected: {
      label: 'Rejected',
      bg: 'var(--me-err-bg)',
      fg: 'var(--me-err-fg)',
    },
    sent: {
      label: 'Sent · awaiting reply',
      bg: 'var(--me-info-bg)',
      fg: 'var(--me-info-fg)',
    },
    draft: {
      label: 'Draft',
      bg: 'var(--me-bg-2)',
      fg: 'var(--me-ink-2)',
    },
    expired: {
      label: 'Expired',
      bg: 'var(--me-warn-bg)',
      fg: 'var(--me-warn-fg)',
    },
  };
  const entry = map[status] ?? {
    label: status,
    bg: 'var(--me-bg-2)',
    fg: 'var(--me-ink-2)',
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: 'var(--me-radius-pill)',
        background: entry.bg,
        color: entry.fg,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.2,
      }}
    >
      {entry.label}
    </span>
  );
}

export function MintEditorialQuoteDetailView({
  quote,
}: MintEditorialQuoteDetailViewProps) {
  const router = useRouter();
  const lineItems = quote.line_items ?? [];
  const hasItems = lineItems.length > 0;

  return (
    <div
      className='col'
      style={{ gap: 24, maxWidth: 1120, margin: '0 auto', width: '100%' }}
    >
      {/* Header */}
      <div className='between' style={{ alignItems: 'flex-start', gap: 24 }}>
        <div className='col' style={{ gap: 10, flex: 1, minWidth: 0 }}>
          <div className='row' style={{ gap: 12, alignItems: 'center' }}>
            {statusChip(quote.status)}
            <span className='t-meta'>
              Created {formatDate(quote.created_at)}
              {quote.valid_until ? ` · valid until ${formatDate(quote.valid_until)}` : ''}
            </span>
          </div>
          <h1 className='t-h1' style={{ margin: 0 }}>
            Quote for{' '}
            <em style={{ color: 'var(--me-brand)', fontStyle: 'italic' }}>
              {quote.title}
            </em>
          </h1>
          {quote.quote_number ? (
            <p className='t-body' style={{ margin: 0 }}>
              Reference{' '}
              <span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--me-ink-2)' }}>
                #{quote.quote_number}
              </span>
            </p>
          ) : null}
        </div>

        {/* Actions row — printable bar on the right; hidden on print */}
        <div
          className='row no-print'
          style={{ gap: 8, flexShrink: 0 }}
        >
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            onClick={() => router.push('/contractor/quotes')}
          >
            <ArrowLeft size={14} strokeWidth={1.75} /> Back
          </button>
          {quote.status === 'draft' && (
            <button type='button' className='btn btn-secondary btn-sm'>
              <Mail size={14} strokeWidth={1.75} /> Send to client
            </button>
          )}
          <button
            type='button'
            className='btn btn-primary btn-sm'
            onClick={() => window.print()}
          >
            <Printer size={14} strokeWidth={1.75} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Main two-column grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 24,
        }}
        className='quote-detail-grid'
      >
        {/* Main column */}
        <div className='col' style={{ gap: 16 }}>
          {/* Project */}
          <section className='card' style={{ padding: 24 }}>
            <p
              className='t-eyebrow'
              style={{
                margin: 0,
                marginBottom: 8,
                color: 'var(--me-ink-3)',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Project
            </p>
            <h2
              className='t-h3'
              style={{ margin: 0, marginBottom: 8 }}
            >
              {quote.title}
            </h2>
            {quote.description ? (
              <p
                className='t-body'
                style={{ margin: 0, color: 'var(--me-ink-2)', lineHeight: 1.55 }}
              >
                {quote.description}
              </p>
            ) : (
              <p className='t-meta' style={{ margin: 0 }}>
                No project description supplied.
              </p>
            )}
          </section>

          {/* Items */}
          <section className='card' style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '16px 24px 12px',
                borderBottom: '1px solid var(--me-line-2)',
              }}
            >
              <p
                className='t-eyebrow'
                style={{
                  margin: 0,
                  color: 'var(--me-ink-3)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Line items
              </p>
            </div>

            {hasItems ? (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr style={{ background: 'var(--me-bg)' }}>
                    <th
                      style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: 12,
                        color: 'var(--me-ink-3)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                      }}
                    >
                      Description
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 600,
                        fontSize: 12,
                        color: 'var(--me-ink-3)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        width: 80,
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 600,
                        fontSize: 12,
                        color: 'var(--me-ink-3)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        width: 120,
                      }}
                    >
                      Unit price
                    </th>
                    <th
                      style={{
                        padding: '12px 24px',
                        textAlign: 'right',
                        fontWeight: 600,
                        fontSize: 12,
                        color: 'var(--me-ink-3)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        width: 120,
                      }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => {
                    const unit = item.unitPrice ?? item.unit_price ?? 0;
                    const total = item.total || item.quantity * unit;
                    return (
                      <tr
                        key={i}
                        style={{
                          borderTop: '1px solid var(--me-line-2)',
                        }}
                      >
                        <td
                          style={{
                            padding: '14px 24px',
                            color: 'var(--me-ink)',
                          }}
                        >
                          {item.description}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            textAlign: 'right',
                            color: 'var(--me-ink-2)',
                          }}
                        >
                          {item.quantity}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            textAlign: 'right',
                            color: 'var(--me-ink-2)',
                          }}
                        >
                          {formatCurrency(unit)}
                        </td>
                        <td
                          style={{
                            padding: '14px 24px',
                            textAlign: 'right',
                            color: 'var(--me-ink)',
                            fontWeight: 600,
                          }}
                        >
                          {formatCurrency(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <FileText
                  size={28}
                  strokeWidth={1.5}
                  color='var(--me-ink-4)'
                  style={{ marginBottom: 8 }}
                />
                <p className='t-body' style={{ margin: 0, color: 'var(--me-ink-3)' }}>
                  No line items on this quote yet.
                </p>
              </div>
            )}

            {/* Totals — only if there's something real to show */}
            {(quote.subtotal || quote.total_amount) ? (
              <div
                style={{
                  borderTop: '1px solid var(--me-line-2)',
                  padding: '16px 24px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  rowGap: 6,
                  columnGap: 24,
                }}
              >
                <span className='t-body' style={{ color: 'var(--me-ink-2)' }}>
                  Subtotal
                </span>
                <span
                  style={{
                    color: 'var(--me-ink-2)',
                    textAlign: 'right',
                  }}
                >
                  {formatCurrency(quote.subtotal)}
                </span>
                <span className='t-body' style={{ color: 'var(--me-ink-2)' }}>
                  Tax ({quote.tax_rate}%)
                </span>
                <span
                  style={{
                    color: 'var(--me-ink-2)',
                    textAlign: 'right',
                  }}
                >
                  {formatCurrency(quote.tax_amount)}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--me-font-display)',
                    fontSize: 20,
                    color: 'var(--me-ink)',
                    paddingTop: 8,
                    borderTop: '1px solid var(--me-line)',
                  }}
                >
                  Total
                </span>
                <span
                  style={{
                    fontFamily: 'var(--me-font-display)',
                    fontSize: 28,
                    color: 'var(--me-ink)',
                    letterSpacing: 'var(--me-display-tracking)',
                    textAlign: 'right',
                    paddingTop: 8,
                    borderTop: '1px solid var(--me-line)',
                  }}
                >
                  {formatCurrency(quote.total_amount)}
                </span>
              </div>
            ) : null}
          </section>

          {/* Notes + Terms — only when real values exist */}
          {(quote.notes || quote.terms) ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: quote.notes && quote.terms ? '1fr 1fr' : '1fr',
                gap: 16,
              }}
            >
              {quote.notes ? (
                <section className='card' style={{ padding: 20 }}>
                  <p
                    className='t-eyebrow'
                    style={{
                      margin: 0,
                      marginBottom: 8,
                      color: 'var(--me-ink-3)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    Notes
                  </p>
                  <p
                    className='t-body'
                    style={{
                      margin: 0,
                      color: 'var(--me-ink-2)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {quote.notes}
                  </p>
                </section>
              ) : null}
              {quote.terms ? (
                <section className='card' style={{ padding: 20 }}>
                  <p
                    className='t-eyebrow'
                    style={{
                      margin: 0,
                      marginBottom: 8,
                      color: 'var(--me-ink-3)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    Terms &amp; conditions
                  </p>
                  <p
                    className='t-body'
                    style={{
                      margin: 0,
                      color: 'var(--me-ink-2)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {quote.terms}
                  </p>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className='col no-print' style={{ gap: 16 }}>
          {/* Client card */}
          <section className='card' style={{ padding: 20 }}>
            <p
              className='t-eyebrow'
              style={{
                margin: 0,
                marginBottom: 12,
                color: 'var(--me-ink-3)',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Client
            </p>
            <p
              style={{
                margin: 0,
                marginBottom: 4,
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--me-ink)',
              }}
            >
              {quote.client_name}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--me-ink-2)',
                wordBreak: 'break-all',
              }}
            >
              {quote.client_email}
            </p>
            {quote.client_phone ? (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 13,
                  color: 'var(--me-ink-2)',
                }}
              >
                {quote.client_phone}
              </p>
            ) : null}
            {quote.client_address ? (
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 13,
                  color: 'var(--me-ink-3)',
                  lineHeight: 1.5,
                }}
              >
                {quote.client_address}
              </p>
            ) : null}
          </section>

          {/* Reference card — only renders fields that exist */}
          {(quote.quote_date || quote.valid_until) ? (
            <section className='card' style={{ padding: 20 }}>
              <p
                className='t-eyebrow'
                style={{
                  margin: 0,
                  marginBottom: 12,
                  color: 'var(--me-ink-3)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Dates
              </p>
              {quote.quote_date ? (
                <div
                  className='between'
                  style={{ fontSize: 13, marginBottom: 6 }}
                >
                  <span style={{ color: 'var(--me-ink-3)' }}>Quote date</span>
                  <span style={{ color: 'var(--me-ink)', fontWeight: 500 }}>
                    {formatDate(quote.quote_date)}
                  </span>
                </div>
              ) : null}
              {quote.valid_until ? (
                <div className='between' style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--me-ink-3)' }}>Valid until</span>
                  <span style={{ color: 'var(--me-ink)', fontWeight: 500 }}>
                    {formatDate(quote.valid_until)}
                  </span>
                </div>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .quote-detail-grid {
            display: block !important;
          }
          .me-root {
            background: white !important;
          }
        }
        @media (max-width: 900px) {
          .quote-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
