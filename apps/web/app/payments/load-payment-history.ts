interface HistoryPage<Payment> {
  payments: Payment[];
  nextCursor?: string;
  nextCursorId?: string;
}

export async function loadPaymentHistory<Payment>(
  signal: AbortSignal,
  paymentId: string | null
): Promise<Payment[]> {
  const params = new URLSearchParams({ limit: '250' });
  if (paymentId) params.set('transactionId', paymentId);
  const payments: Payment[] = [];

  while (true) {
    const response = await fetch(`/api/payments/history?${params}`, { signal });
    if (!response.ok) throw new Error('Failed to load payment history');
    const page: HistoryPage<Payment> = await response.json();
    payments.push(...page.payments);
    if (!page.nextCursor) return payments;
    if (
      params.get('cursor') === page.nextCursor &&
      params.get('cursorId') === (page.nextCursorId ?? null)
    ) {
      throw new Error('Payment history repeated a page');
    }
    params.set('cursor', page.nextCursor);
    if (page.nextCursorId) params.set('cursorId', page.nextCursorId);
    else params.delete('cursorId');
  }
}
