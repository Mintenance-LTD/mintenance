'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';

interface Contractor {
  contractorId: string;
  contractorName: string;
  contractorEmail: string;
  pendingEscrows: number;
  totalPendingAmount: number;
  oldestEscrowDate: string;
}

interface Props {
  contractors: Contractor[];
}

export function PaymentSetupDashboardClient({ contractors }: Props) {
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const sendReminder = async (contractorId: string) => {
    setSending(contractorId);
    try {
      const response = await fetch('/api/admin/contractors/send-payment-setup-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractorId }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reminder');
      }

      setSent((prev) => new Set(prev).add(contractorId));
    } catch (error) {
      alert('Failed to send reminder');
    } finally {
      setSending(null);
    }
  };

  const totalPendingAmount = contractors.reduce((sum, c) => sum + c.totalPendingAmount, 0);
  const totalPendingEscrows = contractors.reduce((sum, c) => sum + c.pendingEscrows, 0);

  return (
    <div style={{
      padding: theme.spacing[8],
      maxWidth: '1440px',
      margin: '0 auto',
      width: '100%',
    }}>
      <AdminPageHeader
        title="Contractors Needing Payment Setup"
        subtitle="Contractors with pending escrow payments who haven't completed payment account setup"
        quickStats={[
          {
            label: 'contractors',
            value: contractors.length,
            icon: 'users',
            color: theme.colors.warning,
          },
          {
            label: 'pending escrows',
            value: totalPendingEscrows,
            icon: 'clock',
            color: '#F59E0B',
          },
          {
            label: 'total amount',
            value: `£${totalPendingAmount.toFixed(0)}`,
            icon: 'currencyPound',
            color: theme.colors.success,
          },
        ]}
      />

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[8],
      }}>
        <AdminMetricCard
          label="Contractors Needing Setup"
          value={contractors.length}
          icon="users"
          iconColor={theme.colors.warning}
        />
        <AdminMetricCard
          label="Total Pending Escrows"
          value={totalPendingEscrows}
          icon="clock"
          iconColor="#F59E0B"
        />
        <AdminMetricCard
          label="Total Pending Amount"
          value={`£${totalPendingAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon="currencyPound"
          iconColor={theme.colors.success}
        />
      </div>

      {contractors.length === 0 ? (
        <Card style={{ padding: theme.spacing[8], textAlign: 'center' }}>
          <Icon name="checkCircle" size={48} color={theme.colors.success} style={{ marginBottom: theme.spacing[4] }} />
          <p style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
          }}>
            All contractors have completed payment setup
          </p>
          <p style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
          }}>
            No action required at this time
          </p>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderBottom: `1px solid ${theme.colors.border}`,
                }}>
                  {['Contractor', 'Email', 'Pending Escrows', 'Total Amount', 'Oldest Escrow', 'Actions'].map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                        textAlign: 'left',
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contractors.map((contractor) => (
                  <tr
                    key={contractor.contractorId}
                    style={{
                      borderBottom: `1px solid ${theme.colors.border}`,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{
                      padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
                      fontSize: theme.typography.fontSize.base,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.textPrimary,
                    }}>
                      {contractor.contractorName}
                    </td>
                    <td style={{
                      padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
                      fontSize: theme.typography.fontSize.base,
                      color: theme.colors.textSecondary,
                    }}>
                      {contractor.contractorEmail}
                    </td>
                    <td style={{
                      padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
                      fontSize: theme.typography.fontSize.base,
                      color: theme.colors.textPrimary,
                    }}>
                      {contractor.pendingEscrows}
                    </td>
                    <td style={{
                      padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
                      fontSize: theme.typography.fontSize.base,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                    }}>
                      £{contractor.totalPendingAmount.toFixed(2)}
                    </td>
                    <td style={{
                      padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
                      fontSize: theme.typography.fontSize.base,
                      color: theme.colors.textSecondary,
                    }}>
                      {format(new Date(contractor.oldestEscrowDate), 'MMM d, yyyy')}
                    </td>
                    <td style={{
                      padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
                    }}>
                      {sent.has(contractor.contractorId) ? (
                        <span style={{
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.success,
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing[1],
                        }}>
                          <Icon name="checkCircle" size={16} color={theme.colors.success} />
                          Reminder sent
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() => sendReminder(contractor.contractorId)}
                          disabled={sending === contractor.contractorId}
                          style={{
                            fontSize: theme.typography.fontSize.sm,
                            padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          }}
                        >
                          {sending === contractor.contractorId ? (
                            <>
                              <Icon name="loader" size={16} className="animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Icon name="send" size={16} />
                              Send Reminder
                            </>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
