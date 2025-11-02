import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { theme } from '@/lib/theme';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { redirect } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { formatMoney } from '@/lib/utils/currency';
import Link from 'next/link';

export default async function FinancialsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/financials');
  }

  // Redirect contractors
  if (user.role === 'contractor') {
    redirect('/contractor/finance');
  }

  // Fetch financial data in parallel
  const [
    paymentsResult,
    subscriptionsResult,
    jobsResult,
    invoicesResult
  ] = await Promise.all([
    // Payments made by homeowner
    serverSupabase
      .from('payments')
      .select(`
        id,
        amount,
        status,
        payment_date,
        created_at,
        due_date,
        description,
        job:jobs!payments_job_id_fkey (
          id,
          title
        )
      `)
      .eq('payer_id', user.id)
      .order('created_at', { ascending: false }),
    // Subscriptions
    serverSupabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    // Jobs for calculating totals
    serverSupabase
      .from('jobs')
      .select('id, budget, status')
      .eq('homeowner_id', user.id),
    // Invoices received (from contractors) - linked through jobs
    serverSupabase
      .from('contractor_invoices')
      .select(`
        id,
        invoice_number,
        title,
        total_amount,
        status,
        invoice_date,
        due_date,
        paid_date,
        job_id,
        contractor:users!contractor_invoices_contractor_id_fkey (
          id,
          first_name,
          last_name
        ),
        job:jobs!contractor_invoices_job_id_fkey (
          id,
          homeowner_id
        )
      `)
      .order('created_at', { ascending: false })
  ]);

  // Extract data and handle errors gracefully
  const paymentsList = paymentsResult.data || [];
  const subscriptionsList = subscriptionsResult.data || [];
  const jobsList = jobsResult.data || [];
  // Filter invoices to only show those for jobs owned by this homeowner
  const invoicesList = ((invoicesResult.data || []) as any[]).filter((invoice: any) => {
    const job = Array.isArray(invoice.job) ? invoice.job[0] : invoice.job;
    return job?.homeowner_id === user.id;
  });

  // Calculate billing overview stats
  const now = new Date();
  const totalSpent = paymentsList
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  
  const pendingPayments = paymentsList
    .filter(p => ['pending', 'processing'].includes(p.status || ''))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  
  const overduePayments = paymentsList.filter(p => {
    if (!p.due_date || p.status === 'completed') return false;
    return new Date(p.due_date) < now && p.status !== 'completed';
  }).length;

  const activeSubscriptions = subscriptionsList.filter(s => s.status === 'active').length;
  const overdueSubscriptions = subscriptionsList.filter(s => {
    if (!s.next_billing_date || s.status !== 'active') return false;
    return new Date(s.next_billing_date) < now;
  }).length;

  const totalBudget = jobsList.reduce((sum, job) => sum + (Number(job.budget) || 0), 0);
  const pendingInvoices = invoicesList.filter(i => ['sent', 'viewed'].includes(i.status || '')).length;
  const overdueInvoices = invoicesList.filter(i => {
    if (!i.due_date || i.status === 'paid') return false;
    return new Date(i.due_date) < now && i.status !== 'paid';
  }).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'active':
        return { bg: '#D1FAE5', text: '#065F46', icon: 'checkCircle' };
      case 'pending':
      case 'processing':
      case 'sent':
      case 'viewed':
        return { bg: '#FEF3C7', text: '#92400E', icon: 'clock' };
      case 'overdue':
      case 'failed':
        return { bg: '#FEE2E2', text: '#991B1B', icon: 'xCircle' };
      case 'cancelled':
      case 'refunded':
        return { bg: '#F3F4F6', text: '#4B5563', icon: 'x' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563', icon: 'info' };
    }
  };

  return (
    <HomeownerLayoutShell currentPath="/financials">
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing[6],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
      }}>
        {/* Header */}
        <div>
        <h1 style={{
            margin: 0,
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
        }}>
          Financials
        </h1>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
          }}>
            Manage your subscriptions, invoices, and billing overview
          </p>
        </div>

        {/* Billing Overview Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: theme.spacing[4],
        }}>
          <div style={{
            backgroundColor: theme.colors.white,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.xl,
            padding: theme.spacing[5],
          }}>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[2],
            }}>
              Total Spent
            </div>
            <div style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              {formatMoney(totalSpent)}
            </div>
          </div>

          <div style={{
            backgroundColor: theme.colors.white,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.xl,
            padding: theme.spacing[5],
          }}>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[2],
            }}>
              Pending Payments
            </div>
            <div style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.accent,
            }}>
              {formatMoney(pendingPayments)}
            </div>
            {overduePayments > 0 && (
              <div style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.error,
                marginTop: theme.spacing[1],
              }}>
                {overduePayments} overdue
              </div>
            )}
          </div>

          <div style={{
            backgroundColor: theme.colors.white,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.xl,
            padding: theme.spacing[5],
          }}>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[2],
            }}>
              Active Subscriptions
            </div>
            <div style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              {activeSubscriptions}
            </div>
            {overdueSubscriptions > 0 && (
              <div style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.error,
                marginTop: theme.spacing[1],
              }}>
                {overdueSubscriptions} overdue
              </div>
            )}
          </div>

          <div style={{
            backgroundColor: theme.colors.white,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.xl,
            padding: theme.spacing[5],
          }}>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[2],
            }}>
              Total Budget
            </div>
            <div style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              {formatMoney(totalBudget)}
            </div>
          </div>
        </div>

        {/* Subscriptions Section */}
        <div style={{
          backgroundColor: theme.colors.white,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
        }}>
          <h2 style={{
            margin: 0,
            marginBottom: theme.spacing[4],
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}>
            Subscriptions ({subscriptionsList.length})
          </h2>

          {subscriptionsList.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing[8],
              color: theme.colors.textSecondary,
            }}>
              <Icon name="calendar" size={48} color={theme.colors.textTertiary} style={{ marginBottom: theme.spacing[2] }} />
              <p style={{ margin: 0, fontSize: theme.typography.fontSize.base }}>
                No subscriptions yet
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              {subscriptionsList.map((sub) => {
                const statusConfig = getStatusColor(sub.status || 'active');
                const nextBilling = sub.next_billing_date
                  ? new Date(sub.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'N/A';
                const isOverdue = sub.next_billing_date && new Date(sub.next_billing_date) < now && sub.status === 'active';

                return (
                  <div
                    key={sub.id}
                    style={{
                      padding: theme.spacing[4],
                      borderRadius: theme.borderRadius.lg,
                      border: `1px solid ${theme.colors.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: theme.spacing[3],
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing[2],
                        marginBottom: theme.spacing[1],
                      }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: theme.typography.fontSize.base,
                          fontWeight: theme.typography.fontWeight.semibold,
                          color: theme.colors.textPrimary,
                        }}>
                          {sub.name || 'Subscription'}
                        </h3>
                        <span style={{
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          borderRadius: theme.borderRadius.full,
                          backgroundColor: statusConfig.bg,
                          color: statusConfig.text,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.semibold,
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing[1],
                        }}>
                          <Icon name={statusConfig.icon as any} size={12} color={statusConfig.text} />
                          {sub.status || 'active'}
                        </span>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textSecondary,
                      }}>
                        Next billing: {nextBilling}
                        {isOverdue && <span style={{ color: theme.colors.error, marginLeft: theme.spacing[1] }}>• Overdue</span>}
                      </p>
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.textPrimary,
                    }}>
                      {formatMoney(Number(sub.amount || 0))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invoices Section */}
        <div style={{
          backgroundColor: theme.colors.white,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing[4],
          }}>
            <h2 style={{
              margin: 0,
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}>
              Invoices ({invoicesList.length})
            </h2>
            {pendingInvoices > 0 && (
              <span style={{
                padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                borderRadius: theme.borderRadius.full,
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
              }}>
                {pendingInvoices} pending
              </span>
            )}
          </div>

          {invoicesList.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing[8],
              color: theme.colors.textSecondary,
            }}>
              <Icon name="fileText" size={48} color={theme.colors.textTertiary} style={{ marginBottom: theme.spacing[2] }} />
              <p style={{ margin: 0, fontSize: theme.typography.fontSize.base }}>
                No invoices yet
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              {invoicesList.map((invoice) => {
                const statusConfig = getStatusColor(invoice.status || 'draft');
                const contractor = Array.isArray(invoice.contractor) ? invoice.contractor[0] : invoice.contractor;
                const contractorName = contractor?.first_name && contractor?.last_name
                  ? `${contractor.first_name} ${contractor.last_name}`
                  : 'Unknown Contractor';
                const dueDate = invoice.due_date
                  ? new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'N/A';
                const invoiceDate = invoice.invoice_date
                  ? new Date(invoice.invoice_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'N/A';
                const isOverdue = invoice.due_date && new Date(invoice.due_date) < now && invoice.status !== 'paid';

                return (
                  <div
                    key={invoice.id}
                    style={{
                      padding: theme.spacing[4],
                      borderRadius: theme.borderRadius.lg,
                      border: `1px solid ${theme.colors.border}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: theme.spacing[3],
                    }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing[2],
                          marginBottom: theme.spacing[1],
                        }}>
                          <h3 style={{
                            margin: 0,
                            fontSize: theme.typography.fontSize.base,
                            fontWeight: theme.typography.fontWeight.semibold,
                            color: theme.colors.textPrimary,
                          }}>
                            {invoice.title || invoice.invoice_number}
                          </h3>
                          <span style={{
                            padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                            borderRadius: theme.borderRadius.full,
                            backgroundColor: statusConfig.bg,
                            color: statusConfig.text,
                            fontSize: theme.typography.fontSize.xs,
                            fontWeight: theme.typography.fontWeight.semibold,
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing[1],
                          }}>
                            <Icon name={statusConfig.icon as any} size={12} color={statusConfig.text} />
                            {invoice.status || 'draft'}
                          </span>
                        </div>
                        <p style={{
                          margin: 0,
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.textSecondary,
                          marginBottom: theme.spacing[1],
                        }}>
                          {contractorName}
                        </p>
                        <div style={{
                          fontSize: theme.typography.fontSize.xs,
                          color: theme.colors.textTertiary,
                        }}>
                          Invoice #{invoice.invoice_number} • {invoiceDate}
                          {invoice.due_date && (
                            <span style={{ marginLeft: theme.spacing[2] }}>
                              Due: {dueDate}
                              {isOverdue && <span style={{ color: theme.colors.error }}> • Overdue</span>}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{
                        fontSize: theme.typography.fontSize.lg,
                        fontWeight: theme.typography.fontWeight.bold,
                        color: theme.colors.textPrimary,
                      }}>
                        {formatMoney(Number(invoice.total_amount || 0))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Payments Section */}
        <div style={{
          backgroundColor: theme.colors.white,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
        }}>
          <h2 style={{
            margin: 0,
            marginBottom: theme.spacing[4],
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}>
            Recent Payments ({paymentsList.length})
          </h2>

          {paymentsList.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing[8],
              color: theme.colors.textSecondary,
            }}>
              <Icon name="currencyDollar" size={48} color={theme.colors.textTertiary} style={{ marginBottom: theme.spacing[2] }} />
              <p style={{ margin: 0, fontSize: theme.typography.fontSize.base }}>
                No payments yet
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              {paymentsList.slice(0, 10).map((payment) => {
                const statusConfig = getStatusColor(payment.status || 'pending');
                const job = Array.isArray(payment.job) ? payment.job[0] : payment.job;
                const paymentDate = payment.payment_date || payment.created_at
                  ? new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'N/A';

                return (
                  <div
                    key={payment.id}
                    style={{
                      padding: theme.spacing[4],
                      borderRadius: theme.borderRadius.lg,
                      border: `1px solid ${theme.colors.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: theme.spacing[3],
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing[2],
                        marginBottom: theme.spacing[1],
                      }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: theme.typography.fontSize.base,
                          fontWeight: theme.typography.fontWeight.semibold,
                          color: theme.colors.textPrimary,
                        }}>
                          {payment.description || job?.title || 'Payment'}
                        </h3>
                        <span style={{
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          borderRadius: theme.borderRadius.full,
                          backgroundColor: statusConfig.bg,
                          color: statusConfig.text,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.semibold,
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing[1],
                        }}>
                          <Icon name={statusConfig.icon as any} size={12} color={statusConfig.text} />
                          {payment.status || 'pending'}
                        </span>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textSecondary,
                      }}>
                        {paymentDate}
                        {job && (
                          <Link href={`/jobs/${job.id}`} style={{
                            marginLeft: theme.spacing[2],
                            color: theme.colors.primary,
                            textDecoration: 'none',
                          }}>
                            View Job →
                          </Link>
                        )}
                      </p>
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.textPrimary,
                    }}>
                      {formatMoney(Number(payment.amount || 0))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </HomeownerLayoutShell>
  );
}


