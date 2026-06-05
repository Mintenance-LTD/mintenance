/**
 * Unit tests for InvoiceService — contractor invoice CRUD facade over
 * the canonical `/api/contractor/invoices` endpoints (amounts in GBP £).
 *
 * Strategy:
 *   - The unit under test (InvoiceService) is NOT mocked.
 *   - Externals are mocked:
 *       * `mobileApiClient` — the HTTP transport (post/patch/get)
 *       * `logger` — info/error sink
 *       * `ServiceErrorHandler` — thin wrapper whose deep deps
 *         (ErrorHandlingService, NetInfo, validators) are irrelevant to
 *         the invoice mapping/validation logic. The mock preserves the
 *         exact behaviours InvoiceService relies on:
 *           - validateRequired throws on null/undefined/''
 *           - validatePositiveNumber throws on <= 0
 *           - executeOperation returns { success, data } / { success:false }
 *   - We assert the EXACT request bodies (taxRate computation, line-item
 *     unit_price coalescing, status coercion, title fallback, optional
 *     field stripping) and the EXACT returned invoice payloads.
 *
 * Date is pinned so generateInvoiceNumber's year is deterministic.
 */

import {
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  getInvoices,
  sendInvoice,
  sendInvoiceReminder,
  generateInvoiceNumber,
} from '../InvoiceService';
import { mobileApiClient } from '../../../../utils/mobileApiClient';
import { logger } from '../../../../utils/logger';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    post: jest.fn(),
    patch: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Behaviour-preserving ServiceErrorHandler mock.
jest.mock('../../../../utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    validateRequired: (value: unknown, fieldName: string) => {
      if (value === null || value === undefined || value === '') {
        throw new Error(`${fieldName} is required`);
      }
    },
    validatePositiveNumber: (value: number, fieldName: string) => {
      if (value <= 0) {
        throw new Error(`${fieldName} must be a positive number`);
      }
    },
    executeOperation: async (op: () => Promise<unknown>) => {
      try {
        const data = await op();
        return { data, success: true };
      } catch (error) {
        return { error, success: false };
      }
    },
  },
}));

const mockPost = mobileApiClient.post as jest.Mock;
const mockPatch = mobileApiClient.patch as jest.Mock;
const mockGet = mobileApiClient.get as jest.Mock;
const mockLoggerInfo = logger.info as jest.Mock;

// A canonical server invoice payload (GBP £).
const fakeInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: 'inv_1',
  invoice_number: 'INV-2026-0001',
  status: 'draft',
  subtotal: 100,
  tax_amount: 20,
  total_amount: 120,
  due_date: '2026-07-01',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// createInvoice
// ===========================================================================

describe('createInvoice', () => {
  it('maps mobile shape → API body with computed taxRate (20% from subtotal/tax) and returns the server invoice', async () => {
    const serverInvoice = fakeInvoice({ status: 'sent', total_amount: 120 });
    mockPost.mockResolvedValue({ success: true, invoice: serverInvoice });

    const result = await createInvoice({
      contractor_id: 'c1',
      client_id: 'client_99',
      job_id: 'job_7',
      invoice_number: 'INV-2026-0001',
      status: 'sent',
      subtotal: 100, // £100 net
      tax_amount: 20, // £20 VAT → 20%
      total_amount: 120, // £120 gross
      due_date: '2026-07-01',
      notes: 'Thanks',
      title: 'Boiler repair',
      line_items: [
        { description: 'Labour', quantity: 2, rate: 30 },
        { description: 'Parts', quantity: 1, unit_price: 40, amount: 40 },
      ],
    });

    expect(result).toBe(serverInvoice);
    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, body] = mockPost.mock.calls[0];
    expect(url).toBe('/api/contractor/invoices');
    expect(body).toEqual({
      jobId: 'job_7',
      clientId: 'client_99',
      clientName: undefined,
      clientEmail: undefined,
      clientPhone: undefined,
      clientAddress: undefined,
      title: 'Boiler repair',
      lineItems: [
        // rate → unit_price; amount undefined
        {
          description: 'Labour',
          quantity: 2,
          unit_price: 30,
          amount: undefined,
        },
        // unit_price preferred over rate; amount preserved
        { description: 'Parts', quantity: 1, unit_price: 40, amount: 40 },
      ],
      taxRate: 20,
      notes: 'Thanks',
      dueDate: '2026-07-01',
      status: 'sent',
    });
  });

  it('defaults taxRate to 20 when subtotal is absent/zero and coerces non-sent status to draft', async () => {
    const serverInvoice = fakeInvoice();
    mockPost.mockResolvedValue({ success: true, invoice: serverInvoice });

    await createInvoice({
      contractor_id: 'c1',
      client_name: 'Jane Doe', // no client_id → clientId undefined
      status: 'paid', // not 'sent' → coerced to 'draft'
      total_amount: 50,
      due_date: '2026-08-01',
      // no subtotal → taxRate falls back to 20
      line_items: [{ description: 'Callout', quantity: 1, rate: 50 }],
    });

    const [, body] = mockPost.mock.calls[0];
    expect(body.taxRate).toBe(20);
    expect(body.status).toBe('draft');
    expect(body.clientId).toBeUndefined();
    expect(body.clientName).toBe('Jane Doe');
    expect(body.jobId).toBeUndefined();
  });

  it('computes a non-default taxRate and rounds it (e.g. £150 net, £7.50 tax → 5%)', async () => {
    mockPost.mockResolvedValue({ success: true, invoice: fakeInvoice() });

    await createInvoice({
      contractor_id: 'c1',
      client_id: 'client_1',
      status: 'draft',
      subtotal: 150,
      tax_amount: 7.5, // 7.5/150 = 5%
      total_amount: 157.5,
      due_date: '2026-09-01',
      line_items: [{ description: 'x', quantity: 1, rate: 150 }],
    });

    const [, body] = mockPost.mock.calls[0];
    expect(body.taxRate).toBe(5);
  });

  it('defaults tax_amount to 0 (taxRate 0) when subtotal present but tax_amount omitted', async () => {
    mockPost.mockResolvedValue({ success: true, invoice: fakeInvoice() });

    await createInvoice({
      contractor_id: 'c1',
      client_id: 'client_1',
      status: 'draft',
      subtotal: 200,
      // tax_amount omitted → (0/200)*100 = 0
      total_amount: 200,
      due_date: '2026-09-01',
      line_items: [{ description: 'x', quantity: 1, rate: 200 }],
    });

    const [, body] = mockPost.mock.calls[0];
    expect(body.taxRate).toBe(0);
  });

  it('builds the title fallback from invoice_number when no title supplied', async () => {
    mockPost.mockResolvedValue({ success: true, invoice: fakeInvoice() });

    await createInvoice({
      contractor_id: 'c1',
      client_id: 'client_1',
      invoice_number: 'INV-2026-0042',
      status: 'draft',
      total_amount: 10,
      due_date: '2026-09-01',
      line_items: [{ description: 'x', quantity: 1, rate: 10 }],
    });

    const [, body] = mockPost.mock.calls[0];
    expect(body.title).toBe('Invoice INV-2026-0042');
  });

  it('builds the trimmed title fallback "Invoice" when neither title nor invoice_number supplied', async () => {
    mockPost.mockResolvedValue({ success: true, invoice: fakeInvoice() });

    await createInvoice({
      contractor_id: 'c1',
      client_id: 'client_1',
      status: 'draft',
      total_amount: 10,
      due_date: '2026-09-01',
      line_items: [{ description: 'x', quantity: 1, rate: 10 }],
    });

    const [, body] = mockPost.mock.calls[0];
    expect(body.title).toBe('Invoice');
  });

  it('defaults line-item quantity to 1 and unit_price to 0 when both rate and unit_price are missing', async () => {
    mockPost.mockResolvedValue({ success: true, invoice: fakeInvoice() });

    await createInvoice({
      contractor_id: 'c1',
      client_id: 'client_1',
      status: 'draft',
      total_amount: 10,
      due_date: '2026-09-01',
      line_items: [{ description: 'Mystery' } as never],
    });

    const [, body] = mockPost.mock.calls[0];
    expect(body.lineItems).toEqual([
      { description: 'Mystery', quantity: 1, unit_price: 0, amount: undefined },
    ]);
  });

  it('handles a missing line_items array (defaults to empty list)', async () => {
    mockPost.mockResolvedValue({ success: true, invoice: fakeInvoice() });

    await createInvoice({
      contractor_id: 'c1',
      client_id: 'client_1',
      status: 'draft',
      total_amount: 10,
      due_date: '2026-09-01',
      line_items: undefined as never,
    });

    const [, body] = mockPost.mock.calls[0];
    expect(body.lineItems).toEqual([]);
  });

  it('throws "Failed to create invoice" when contractor_id is missing (validateRequired path)', async () => {
    await expect(
      createInvoice({
        contractor_id: '',
        client_id: 'client_1',
        status: 'draft',
        total_amount: 10,
        due_date: '2026-09-01',
        line_items: [],
      })
    ).rejects.toThrow('Failed to create invoice');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('throws when neither client_id nor a non-blank client_name is provided', async () => {
    await expect(
      createInvoice({
        contractor_id: 'c1',
        client_name: '   ', // whitespace only → trim() falsy
        status: 'draft',
        total_amount: 10,
        due_date: '2026-09-01',
        line_items: [],
      })
    ).rejects.toThrow('Failed to create invoice');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('throws when total_amount is not positive (validatePositiveNumber path)', async () => {
    await expect(
      createInvoice({
        contractor_id: 'c1',
        client_id: 'client_1',
        status: 'draft',
        total_amount: 0,
        due_date: '2026-09-01',
        line_items: [],
      })
    ).rejects.toThrow('Failed to create invoice');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('throws "Failed to create invoice" when the API returns no invoice payload', async () => {
    mockPost.mockResolvedValue({ success: true, invoice: null });

    await expect(
      createInvoice({
        contractor_id: 'c1',
        client_id: 'client_1',
        status: 'draft',
        total_amount: 10,
        due_date: '2026-09-01',
        line_items: [{ description: 'x', quantity: 1, rate: 10 }],
      })
    ).rejects.toThrow('Failed to create invoice');
  });

  it('throws "Failed to create invoice" when the API call itself rejects', async () => {
    mockPost.mockRejectedValue(new Error('network down'));

    await expect(
      createInvoice({
        contractor_id: 'c1',
        client_id: 'client_1',
        status: 'draft',
        total_amount: 10,
        due_date: '2026-09-01',
        line_items: [{ description: 'x', quantity: 1, rate: 10 }],
      })
    ).rejects.toThrow('Failed to create invoice');
  });
});

// ===========================================================================
// updateInvoice (full PATCH for the edit flow)
// ===========================================================================

describe('updateInvoice', () => {
  it('maps only the provided fields into the PATCH body and encodes the id in the query string', async () => {
    const updated = fakeInvoice({ id: 'inv 9', status: 'sent' });
    mockPatch.mockResolvedValue({ success: true, invoice: updated });

    const result = await updateInvoice('inv 9', {
      clientName: 'Acme Ltd',
      title: 'Revised invoice',
      taxRate: 20,
      status: 'sent',
      dueDate: '2026-10-01',
      lineItems: [
        { description: 'Labour', quantity: 3, rate: 25 },
        { description: 'Parts', quantity: 1, unit_price: 15, amount: 15 },
      ],
    });

    expect(result).toBe(updated);
    const [url, body] = mockPatch.mock.calls[0];
    // space encoded → inv%209
    expect(url).toBe('/api/contractor/invoices?id=inv%209');
    expect(body).toEqual({
      clientName: 'Acme Ltd',
      title: 'Revised invoice',
      taxRate: 20,
      status: 'sent',
      dueDate: '2026-10-01',
      lineItems: [
        {
          description: 'Labour',
          quantity: 3,
          unit_price: 25,
          amount: undefined,
        },
        { description: 'Parts', quantity: 1, unit_price: 15, amount: 15 },
      ],
    });
    // omitted fields must NOT appear
    expect(body).not.toHaveProperty('clientEmail');
    expect(body).not.toHaveProperty('notes');
    expect(body).not.toHaveProperty('reminder');
  });

  it('includes every optional field when supplied, and reminder:true only when explicitly true', async () => {
    mockPatch.mockResolvedValue({ success: true, invoice: fakeInvoice() });

    await updateInvoice('inv_1', {
      clientName: 'A',
      clientEmail: 'a@b.co.uk',
      clientAddress: '1 High St',
      title: 'T',
      description: 'D',
      taxRate: 5,
      paymentTerms: 'Net 30',
      notes: 'N',
      dueDate: '2026-11-01',
      status: 'overdue',
      reminder: true,
    });

    const [, body] = mockPatch.mock.calls[0];
    expect(body).toEqual({
      clientName: 'A',
      clientEmail: 'a@b.co.uk',
      clientAddress: '1 High St',
      title: 'T',
      description: 'D',
      taxRate: 5,
      paymentTerms: 'Net 30',
      notes: 'N',
      dueDate: '2026-11-01',
      status: 'overdue',
      reminder: true,
    });
  });

  it('omits reminder when reminder is false (only literal true forwards it)', async () => {
    mockPatch.mockResolvedValue({ success: true, invoice: fakeInvoice() });

    await updateInvoice('inv_1', { notes: 'x', reminder: false });

    const [, body] = mockPatch.mock.calls[0];
    expect(body).toEqual({ notes: 'x' });
    expect(body).not.toHaveProperty('reminder');
  });

  it('produces an empty body when no fields are supplied (and lineItems stays undefined)', async () => {
    mockPatch.mockResolvedValue({ success: true, invoice: fakeInvoice() });

    await updateInvoice('inv_1', {});

    const [, body] = mockPatch.mock.calls[0];
    expect(body).toEqual({});
  });

  it('defaults updated line-item quantity to 1 and unit_price to 0 when missing', async () => {
    mockPatch.mockResolvedValue({ success: true, invoice: fakeInvoice() });

    await updateInvoice('inv_1', {
      lineItems: [{ description: 'Misc' } as never],
    });

    const [, body] = mockPatch.mock.calls[0];
    expect(body.lineItems).toEqual([
      { description: 'Misc', quantity: 1, unit_price: 0, amount: undefined },
    ]);
  });

  it('throws "Invoice update returned no payload" when the API omits the invoice', async () => {
    mockPatch.mockResolvedValue({ success: true, invoice: undefined });

    await expect(updateInvoice('inv_1', { notes: 'x' })).rejects.toThrow(
      'Invoice update returned no payload'
    );
  });

  it('propagates the rejection when the PATCH itself fails (no executeOperation wrapper here)', async () => {
    mockPatch.mockRejectedValue(new Error('500 server error'));

    await expect(updateInvoice('inv_1', { notes: 'x' })).rejects.toThrow(
      '500 server error'
    );
  });
});

// ===========================================================================
// updateInvoiceStatus (status transitions: draft/sent/paid/overdue)
// ===========================================================================

describe('updateInvoiceStatus', () => {
  it.each(['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const)(
    'PATCHes status=%s and returns the updated invoice',
    async (status) => {
      const updated = fakeInvoice({ status });
      mockPatch.mockResolvedValue({ success: true, invoice: updated });

      const result = await updateInvoiceStatus('inv_5', status, 'c1');

      expect(result).toBe(updated);
      const [url, body] = mockPatch.mock.calls[0];
      expect(url).toBe('/api/contractor/invoices?id=inv_5');
      expect(body).toEqual({ status });
    }
  );

  it('throws "Failed to update invoice status" when invoiceId is missing', async () => {
    await expect(updateInvoiceStatus('', 'paid', 'c1')).rejects.toThrow(
      'Failed to update invoice status'
    );
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('throws "Failed to update invoice status" when status is missing', async () => {
    await expect(
      updateInvoiceStatus('inv_5', '' as never, 'c1')
    ).rejects.toThrow('Failed to update invoice status');
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('throws "Failed to update invoice status" when the API returns no invoice', async () => {
    mockPatch.mockResolvedValue({ success: true, invoice: null });

    await expect(updateInvoiceStatus('inv_5', 'paid', 'c1')).rejects.toThrow(
      'Failed to update invoice status'
    );
  });

  it('throws "Failed to update invoice status" when the PATCH rejects', async () => {
    mockPatch.mockRejectedValue(new Error('boom'));

    await expect(updateInvoiceStatus('inv_5', 'paid', 'c1')).rejects.toThrow(
      'Failed to update invoice status'
    );
  });
});

// ===========================================================================
// getInvoices (list + filters: status, dateFrom, dateTo)
// ===========================================================================

describe('getInvoices', () => {
  it('requests with limit=200 and no filters, returning the invoices array', async () => {
    const invoices = [fakeInvoice(), fakeInvoice({ id: 'inv_2' })];
    mockGet.mockResolvedValue({ invoices, total: 2 });

    const result = await getInvoices('c1');

    expect(result).toBe(invoices);
    const [url] = mockGet.mock.calls[0];
    expect(url).toBe('/api/contractor/invoices?limit=200');
  });

  it('appends status, period_start and period_end query params when filters are set', async () => {
    mockGet.mockResolvedValue({ invoices: [] });

    await getInvoices('c1', {
      status: 'overdue',
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    });

    const [url] = mockGet.mock.calls[0];
    expect(url).toBe(
      '/api/contractor/invoices?limit=200&status=overdue&period_start=2026-01-01&period_end=2026-12-31'
    );
  });

  it('appends only the filters that are present (dateFrom only)', async () => {
    mockGet.mockResolvedValue({ invoices: [] });

    await getInvoices('c1', { dateFrom: '2026-03-01' });

    const [url] = mockGet.mock.calls[0];
    expect(url).toBe(
      '/api/contractor/invoices?limit=200&period_start=2026-03-01'
    );
  });

  it('returns [] when the API response has no invoices field', async () => {
    mockGet.mockResolvedValue({});

    const result = await getInvoices('c1');
    expect(result).toEqual([]);
  });

  it('returns [] when the API response is null/undefined', async () => {
    mockGet.mockResolvedValue(undefined);

    const result = await getInvoices('c1');
    expect(result).toEqual([]);
  });

  it('returns [] when contractorId is missing (validation fails → !success branch)', async () => {
    const result = await getInvoices('');
    expect(result).toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns [] when the GET rejects (executeOperation failure → !success branch)', async () => {
    mockGet.mockRejectedValue(new Error('timeout'));

    const result = await getInvoices('c1');
    expect(result).toEqual([]);
  });
});

// ===========================================================================
// sendInvoice / sendInvoiceReminder
// ===========================================================================

describe('sendInvoice', () => {
  it('marks the invoice as sent via updateInvoiceStatus and logs it', async () => {
    mockPatch.mockResolvedValue({
      success: true,
      invoice: fakeInvoice({ status: 'sent' }),
    });

    await sendInvoice('inv_8', 'c1');

    const [url, body] = mockPatch.mock.calls[0];
    expect(url).toBe('/api/contractor/invoices?id=inv_8');
    expect(body).toEqual({ status: 'sent' });
    expect(mockLoggerInfo).toHaveBeenCalledWith('Invoice marked as sent', {
      invoiceId: 'inv_8',
    });
  });

  it('propagates the failure (and does not log success) when the underlying status update fails', async () => {
    mockPatch.mockResolvedValue({ success: true, invoice: null });

    await expect(sendInvoice('inv_8', 'c1')).rejects.toThrow(
      'Failed to update invoice status'
    );
    expect(mockLoggerInfo).not.toHaveBeenCalledWith(
      'Invoice marked as sent',
      expect.anything()
    );
  });
});

describe('sendInvoiceReminder', () => {
  it('fires a reminder:true PATCH and logs it', async () => {
    mockPatch.mockResolvedValue({
      success: true,
      invoice: fakeInvoice({ status: 'sent' }),
    });

    await sendInvoiceReminder('inv_3');

    const [url, body] = mockPatch.mock.calls[0];
    expect(url).toBe('/api/contractor/invoices?id=inv_3');
    expect(body).toEqual({ reminder: true });
    expect(mockLoggerInfo).toHaveBeenCalledWith('Invoice reminder sent', {
      invoiceId: 'inv_3',
    });
  });

  it('propagates failure (and does not log) when the reminder PATCH returns no invoice', async () => {
    mockPatch.mockResolvedValue({ success: true, invoice: undefined });

    await expect(sendInvoiceReminder('inv_3')).rejects.toThrow(
      'Invoice update returned no payload'
    );
    expect(mockLoggerInfo).not.toHaveBeenCalledWith(
      'Invoice reminder sent',
      expect.anything()
    );
  });
});

// ===========================================================================
// generateInvoiceNumber
// ===========================================================================

describe('generateInvoiceNumber', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a year-stamped DRAFT placeholder for the current year', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-05T12:00:00.000Z'));

    const number = await generateInvoiceNumber('c1');
    expect(number).toBe('INV-2026-DRAFT');
  });
});
