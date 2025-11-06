'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { PageLayout, PageHeader } from '@/components/ui/PageLayout';
import { Card } from '@/components/ui/Card.unified';
import { Badge } from '@/components/ui/Badge.unified';
import { ProgressBar } from '@/components/ui/ProgressBar';

type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'paid';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  status: InvoiceStatus;
  due_date: string;
  created_at: string;
}

interface InvoiceManagementClientProps {
  invoices: Invoice[];
  stats: {
    totalOutstanding: number;
    overdue: number;
    paidThisMonth: number;
  };
}

const FILTERS: Array<{ id: 'all' | InvoiceStatus; label: string }> = [
  { id: 'all', label: 'All invoices' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
];

const STATUS_VARIANT: Record<InvoiceStatus, 'neutral' | 'info' | 'warning' | 'success'> = {
  draft: 'neutral',
  sent: 'info',
  overdue: 'warning',
  paid: 'success',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  overdue: 'Overdue',
  paid: 'Paid',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value || 0);

export function InvoiceManagementClient({ invoices, stats }: InvoiceManagementClientProps) {
  const [selectedFilter, setSelectedFilter] = useState<(typeof FILTERS)[number]['id']>('all');

  const filteredInvoices = useMemo(() => {
    if (selectedFilter === 'all') return invoices;
    return invoices.filter((invoice) => invoice.status === selectedFilter);
  }, [invoices, selectedFilter]);

  const summaryCards = useMemo(
    () => [
      { label: 'Outstanding', value: formatCurrency(stats.totalOutstanding), icon: 'creditCard', variant: 'warning' as const },
      { label: 'Overdue invoices', value: stats.overdue.toString(), icon: 'alert', variant: 'error' as const },
      { label: 'Paid this month', value: formatCurrency(stats.paidThisMonth), icon: 'checkCircle', variant: 'success' as const },
    ],
    [stats],
  );

  const paidCount = invoices.filter((invoice) => invoice.status === 'paid').length;
  const paidRatio = invoices.length > 0 ? Math.round((paidCount / invoices.length) * 100) : 0;

  return (
    <PageLayout
      sidebar={
        <>
          <Card>
            <ProgressBar
              value={paidRatio}
              label="Payment completion"
              tone={paidRatio >= 75 ? 'success' : paidRatio >= 40 ? 'warning' : 'neutral'}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2], marginTop: theme.spacing[4] }}>
              {(FILTERS.filter((filter) => filter.id !== 'all') as Array<{ id: InvoiceStatus; label: string }>).map((filter) => {
                const count = invoices.filter((invoice) => invoice.status === filter.id).length;
                return (
                  <div
                    key={filter.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                      backgroundColor: theme.colors.backgroundSecondary,
                      borderRadius: theme.borderRadius.md,
                      alignItems: 'center',
                    }}
                  >
                    <Badge variant={STATUS_VARIANT[filter.id]} withDot size="sm">{STATUS_LABEL[filter.id]}</Badge>
                    <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                      {count} invoices
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <Link href="/contractor/invoices/create" style={{ textDecoration: 'none' }}>
              <Button variant="primary" fullWidth>
                <Icon name="plus" size={16} color={theme.colors.white} />
                <span style={{ marginLeft: theme.spacing[2] }}>Create invoice</span>
              </Button>
            </Link>
          </Card>
        </>
      }
    >
      <PageHeader
        title="Invoice management"
        description="Keep cash flow healthy with clear statuses and quick follow-up actions."
        actions={
          <Link href="/contractor/invoices/create" style={{ textDecoration: 'none' }}>
            <Button variant="primary">
              <Icon name="plus" size={16} color={theme.colors.white} />
              <span style={{ marginLeft: theme.spacing[2] }}>New invoice</span>
            </Button>
          </Link>
        }
      />

      <div style={{ display: 'grid', gap: theme.spacing[4], gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <div style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold }}>
              {card.value}
            </div>
            <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing[2] }}>
              {card.label}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          <nav style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap' }}>
            {FILTERS.map((filter) => {
              const isActive = filter.id === selectedFilter;
              return (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  style={{
                    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                    borderRadius: 999,
                    border: `1px solid ${isActive ? theme.colors.primary : theme.colors.border}`,
                    backgroundColor: isActive ? theme.colors.backgroundSecondary : theme.colors.surface,
                    color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.semibold,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </nav>

          {filteredInvoices.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: `${theme.spacing[12]} ${theme.spacing[6]}`,
                color: theme.colors.textSecondary,
                border: `1px dashed ${theme.colors.border}`,
                borderRadius: theme.borderRadius.lg,
                backgroundColor: theme.colors.backgroundSecondary,
              }}
            >
              <div style={{ marginBottom: theme.spacing[4], display: 'flex', justifyContent: 'center' }}>
                <Icon name="clipboard" size={48} color={theme.colors.textQuaternary} />
              </div>
              <h3 style={{ margin: 0, marginBottom: theme.spacing[2], color: theme.colors.textPrimary }}>No invoices</h3>
              <p style={{ margin: 0 }}>
                {selectedFilter === 'all'
                  ? 'Create your first invoice to track payments.'
                  : `There are no ${selectedFilter} invoices at the moment.`}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              {filteredInvoices.map((invoice) => (
                <article
                  key={invoice.id}
                  style={{
                    borderRadius: '18px',
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.backgroundSecondary,
                    padding: theme.spacing[5],
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing[3],
                  }}
                >
                  <header
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: theme.spacing[3],
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: theme.typography.fontSize.lg,
                          fontWeight: theme.typography.fontWeight.semibold,
                          color: theme.colors.textPrimary,
                        }}
                      >
                        Invoice #{invoice.invoice_number}
                      </h3>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing[2],
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.textSecondary,
                        }}
                      >
                        <span>{invoice.client_name}</span>
                        <Icon name="dot" size={8} color={theme.colors.textQuaternary} />
                        <span>Due {new Date(invoice.due_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: theme.typography.fontSize.lg, color: theme.colors.textPrimary }}>
                        {formatCurrency(invoice.total_amount)}
                      </strong>
                      <Badge
                        variant={STATUS_VARIANT[invoice.status]}
                        withDot
                        size="sm"
                      >
                        {STATUS_LABEL[invoice.status]}
                      </Badge>
                    </div>
                  </header>

                  <div
                    style={{
                      display: 'flex',
                      gap: theme.spacing[3],
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>Created {new Date(invoice.created_at).toLocaleDateString()}</span>
                    <Icon name="dot" size={8} color={theme.colors.textQuaternary} />
                    <span>
                      {invoice.status === 'overdue'
                        ? `Overdue by ${Math.max(
                            0,
                            Math.round(
                              (Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24),
                            ),
                          )} days`
                        : `Status: ${STATUS_LABEL[invoice.status]}`}
                    </span>
                  </div>

                  <footer style={{ display: 'flex', gap: theme.spacing[3], flexWrap: 'wrap' }}>
                    <Link href={`/contractor/invoices/${invoice.id}`} style={{ textDecoration: 'none' }}>
                      <Button variant="primary" size="sm">
                        View invoice
                      </Button>
                    </Link>
                    {invoice.status !== 'paid' && (
                      <Button variant="secondary" size="sm">
                        Send reminder
                      </Button>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </div>
      </Card>
    </PageLayout>
  );
}

