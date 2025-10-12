'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { PageLayout, PageHeader, StatsGrid } from '@/components/ui/PageLayout';
import { StatCard } from '@/components/ui/StatCard';
import { StandardCard } from '@/components/ui/StandardCard';
import { StatusChip } from '@/components/ui/StatusChip';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import { ProgressBar } from '@/components/ui/ProgressBar';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

interface Quote {
  id: string;
  quote_number: string;
  client_name: string;
  project_title: string;
  status: QuoteStatus;
  total_amount: string;
  created_at: string;
  valid_until: string;
}

interface QuoteBuilderClientProps {
  quotes: Quote[];
  stats: {
    total_quotes: number;
    draft_quotes: number;
    sent_quotes: number;
    accepted_quotes: number;
    rejected_quotes: number;
    total_value: number;
    acceptance_rate: number;
  };
}

type Feedback = { type: 'success' | 'error'; message: string } | null;

const STATUS_FILTERS: Array<{ id: 'all' | QuoteStatus; label: string }> = [
  { id: 'all', label: 'All quotes' },
  { id: 'draft', label: 'Drafts' },
  { id: 'sent', label: 'Sent' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
];

const STATUS_TONE: Record<QuoteStatus, 'neutral' | 'info' | 'success' | 'error'> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  rejected: 'error',
};

const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

const formatCurrency = (value: number | string) => {
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(numeric)) return '£0.00';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(numeric);
};

export function QuoteBuilderClient({ quotes, stats }: QuoteBuilderClientProps) {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<(typeof STATUS_FILTERS)[number]['id']>('all');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pendingDelete, setPendingDelete] = useState<Quote | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const filteredQuotes = useMemo(() => {
    if (selectedFilter === 'all') return quotes;
    return quotes.filter((quote) => quote.status === selectedFilter);
  }, [quotes, selectedFilter]);

  const summaryCards = useMemo(
    () => [
      { label: 'Total quotes', value: stats.total_quotes.toString(), icon: 'document' },
      { label: 'Draft', value: stats.draft_quotes.toString(), icon: 'clipboard' },
      { label: 'Sent', value: stats.sent_quotes.toString(), icon: 'megaphone' },
      { label: 'Accepted', value: stats.accepted_quotes.toString(), icon: 'checkCircle' },
      { label: 'Rejected', value: stats.rejected_quotes.toString(), icon: 'xCircle' },
      { label: 'Total value', value: formatCurrency(stats.total_value), icon: 'currencyDollar' },
    ],
    [stats],
  );

  const acceptanceRate = Math.round(stats.acceptance_rate || 0);

  const statusBreakdown = useMemo(
    () =>
      (['draft', 'sent', 'accepted', 'rejected'] as QuoteStatus[]).map((status) => ({
        status,
        count: quotes.filter((quote) => quote.status === status).length,
      })),
    [quotes],
  );

  const stageTotal = statusBreakdown.reduce((sum, item) => sum + item.count, 0) || 1;

  const handleSendQuote = async (quoteId: string) => {
    try {
      setActionBusyId(quoteId);
      const response = await fetch('/api/contractor/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send quote');
      }

      setFeedback({ type: 'success', message: 'Quote sent successfully.' });
      router.refresh();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to send quote.' });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteQuote = async () => {
    if (!pendingDelete) return;

    try {
      setActionBusyId(pendingDelete.id);
      const response = await fetch('/api/contractor/delete-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: pendingDelete.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete quote');
      }

      setFeedback({ type: 'success', message: 'Quote deleted successfully.' });
      router.refresh();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Failed to delete quote.' });
    } finally {
      setActionBusyId(null);
      setPendingDelete(null);
    }
  };

  return (
    <PageLayout
      sidebar={
        <>
          <StandardCard
            title="Pipeline health"
            description="Monitor conversion across every stage."
          >
            <ProgressBar
              value={acceptanceRate}
              label="Acceptance rate"
              tone={acceptanceRate >= 50 ? 'success' : 'warning'}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2], marginTop: theme.spacing[4] }}>
              {statusBreakdown.map(({ status, count }) => (
                <div
                  key={status}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: theme.colors.backgroundSecondary,
                  }}
                >
                  <StatusChip
                    label={STATUS_LABEL[status]}
                    tone={STATUS_TONE[status]}
                    withDot
                  />
                  <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                    {count} ({Math.round((count / stageTotal) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </StandardCard>

          <StandardCard
            title="Need something quick?"
            description="Create a new quote or duplicate a recent one."
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              <Link href="/contractor/quotes/create" style={{ textDecoration: 'none' }}>
                <Button variant="primary" fullWidth>
                  <Icon name="plus" size={16} color={theme.colors.white} />
                  <span style={{ marginLeft: theme.spacing[2] }}>New quote</span>
                </Button>
              </Link>
              <Link href="/contractor/quotes" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" fullWidth>
                  View templates
                </Button>
              </Link>
            </div>
          </StandardCard>
        </>
      }
    >
      <PageHeader
        title="Quote Builder"
        description="Keep proposals moving with clear statuses, reminders, and inline actions."
        actions={
          <Link href="/contractor/quotes/create" style={{ textDecoration: 'none' }}>
            <Button variant="primary">
              <Icon name="plus" size={16} color={theme.colors.white} />
              <span style={{ marginLeft: theme.spacing[2] }}>Create quote</span>
            </Button>
          </Link>
        }
      />

      {feedback && (
        <NotificationBanner
          tone={feedback.type === 'success' ? 'success' : 'error'}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
          style={{ marginBottom: theme.spacing[4] }}
        />
      )}

      <StatsGrid>
        {summaryCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} />
        ))}
      </StatsGrid>

      <StandardCard
        title="Quotes"
        description="Filter by status to prioritise follow-ups."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          <nav style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map((filter) => {
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

          {filteredQuotes.length === 0 ? (
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: theme.spacing[4] }}>
                <Icon name="fileText" size={40} color={theme.colors.textQuaternary} />
              </div>
              <h3 style={{ margin: 0, marginBottom: theme.spacing[2], color: theme.colors.textPrimary }}>
                No quotes in this view
              </h3>
              <p style={{ margin: 0 }}>
                {selectedFilter === 'all'
                  ? 'Create your first quote to start tracking proposals.'
                  : `There are no ${selectedFilter} quotes right now.`}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              {filteredQuotes.map((quote) => {
                const busy = actionBusyId === quote.id;
                return (
                  <article
                    key={quote.id}
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
                          {quote.project_title || 'Untitled quote'}
                        </h3>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing[2],
                            color: theme.colors.textSecondary,
                            fontSize: theme.typography.fontSize.sm,
                          }}
                        >
                          <span>Quote #{quote.quote_number}</span>
                          <Icon name="dot" size={10} color={theme.colors.textQuaternary} />
                          <span>{quote.client_name}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: theme.typography.fontSize.lg, color: theme.colors.primary }}>
                          {formatCurrency(quote.total_amount)}
                        </strong>
                        <StatusChip
                          label={STATUS_LABEL[quote.status]}
                          tone={STATUS_TONE[quote.status]}
                          withDot
                        />
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
                      <span>Created {new Date(quote.created_at).toLocaleDateString()}</span>
                      <Icon name="dot" size={8} color={theme.colors.textQuaternary} />
                      <span>Valid until {new Date(quote.valid_until).toLocaleDateString()}</span>
                    </div>

                    <footer style={{ display: 'flex', gap: theme.spacing[3], flexWrap: 'wrap' }}>
                      <Link href={`/contractor/quotes/${quote.id}`} style={{ textDecoration: 'none' }}>
                        <Button variant="primary" size="sm">
                          View details
                        </Button>
                      </Link>

                      {quote.status === 'draft' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSendQuote(quote.id)}
                          disabled={busy}
                        >
                          {busy ? 'Sending...' : 'Send quote'}
                        </Button>
                      )}

                      <Link href={`/contractor/quotes/create?duplicate=${quote.id}`} style={{ textDecoration: 'none' }}>
                        <Button variant="ghost" size="sm">
                          Duplicate
                        </Button>
                      </Link>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(quote)}
                        disabled={busy}
                        style={{ color: theme.colors.error }}
                      >
                        Delete
                      </Button>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </StandardCard>

      {pendingDelete && (
        <StandardCard title="Delete quote" description="This action cannot be undone.">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[4],
            }}
          >
            <NotificationBanner
              tone="warning"
              message={`Delete ${pendingDelete.project_title || pendingDelete.quote_number}?`}
            />
            <div style={{ display: 'flex', gap: theme.spacing[3], justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteQuote}
                disabled={actionBusyId === pendingDelete.id}
                style={{ backgroundColor: theme.colors.error }}
              >
                {actionBusyId === pendingDelete.id ? 'Deleting...' : 'Delete quote'}
              </Button>
            </div>
          </div>
        </StandardCard>
      )}
    </PageLayout>
  );
}

