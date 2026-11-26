export type Arrangement = 'agency_contractor' | 'arranged_outside';

export interface WorkOrder {
  ticketId: string;
  revision: number;
  arrangement: Arrangement;
  contractorName: string;
  quotedPence: number | null;
  approvedPence: number | null;
  approvalReference: string | null;
  invoicedPence: number | null;
  invoiceReference: string | null;
  paidPence: number | null;
  paymentReference: string | null;
  completionNote: string | null;
  updatedAt: string;
}

export type WorkOrderInput = Omit<WorkOrder, 'ticketId' | 'updatedAt'>;

const fields = [
  'quotedPence',
  'approvedPence',
  'invoicedPence',
  'paidPence',
] as const;

export type WorkOrderDraft = Omit<WorkOrderInput, (typeof fields)[number]> &
  Record<(typeof fields)[number], string>;

const money = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

export function amountLabel(pence: number | null): string {
  return pence === null ? 'Not recorded' : money.format(pence / 100);
}

export function workOrderDraft(order: WorkOrder | null): WorkOrderDraft {
  return {
    revision: order?.revision ?? 0,
    arrangement: order?.arrangement ?? 'agency_contractor',
    contractorName: order?.contractorName ?? '',
    ...(Object.fromEntries(
      fields.map((key) => [
        key,
        order?.[key] == null ? '' : (order[key] / 100).toFixed(2),
      ])
    ) as Record<(typeof fields)[number], string>),
    approvalReference: order?.approvalReference ?? '',
    invoiceReference: order?.invoiceReference ?? '',
    paymentReference: order?.paymentReference ?? '',
    completionNote: order?.completionNote ?? '',
  };
}

export function parsePounds(value: string, label: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(
      `Enter ${label.toLowerCase()} as pounds and pence, for example 240.50.`
    );
  }
  const [pounds, pennies = ''] = trimmed.split('.');
  const pence = Number(pounds) * 100 + Number(pennies.padEnd(2, '0'));
  if (pence > 100_000_000)
    throw new Error(`${label} cannot exceed £1,000,000.`);
  return pence;
}

export function workOrderInput(draft: WorkOrderDraft): WorkOrderInput {
  const contractorName = draft.contractorName.trim();
  if (!contractorName) throw new Error('Enter the contractor or company name.');
  const nullable = (v: string | null) => v?.trim() || null;
  const quotedPence = parsePounds(draft.quotedPence, 'Quoted cost');
  const approvedPence = parsePounds(draft.approvedPence, 'Approved cost');
  const invoicedPence = parsePounds(draft.invoicedPence, 'Invoiced cost');
  const paidPence = parsePounds(draft.paidPence, 'Paid cost');
  const approvalReference =
    approvedPence === null ? null : nullable(draft.approvalReference);
  const invoiceReference =
    invoicedPence === null ? null : nullable(draft.invoiceReference);
  const paymentReference =
    paidPence === null ? null : nullable(draft.paymentReference);

  if (
    approvedPence !== null &&
    (!approvalReference || quotedPence === null || approvedPence > quotedPence)
  )
    throw new Error(
      'Record the approval reference and an amount no higher than the quote.'
    );
  if (invoicedPence !== null && !invoiceReference)
    throw new Error('Enter the invoice reference.');
  if (
    paidPence !== null &&
    (!paymentReference || invoicedPence === null || paidPence > invoicedPence)
  )
    throw new Error(
      'Record a payment reference and an amount no higher than the invoice.'
    );

  return {
    revision: draft.revision,
    arrangement: draft.arrangement,
    contractorName,
    quotedPence,
    approvedPence,
    approvalReference,
    invoicedPence,
    invoiceReference,
    paidPence,
    paymentReference,
    completionNote: nullable(draft.completionNote),
  };
}
