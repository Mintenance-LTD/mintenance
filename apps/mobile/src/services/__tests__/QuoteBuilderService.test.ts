/**
 * Unit tests for QuoteBuilderService (the facade) and the quotes/* modules
 * it re-exports as static methods.
 *
 * The facade is a thin pass-through to ./quotes/*; exercising the static
 * methods runs the REAL underlying module code. External deps are mocked:
 *   - mobileApiClient (manual mock at utils/__mocks__/mobileApiClient.ts)
 *   - logger (info/warn/error/debug)
 *
 * Assertions cover happy paths, error/throw paths, every conditional branch,
 * and exact numeric results for the quote total/VAT/markup/discount maths.
 */

import { QuoteBuilderService } from '../QuoteBuilderService';
import { mobileApiClient } from '../../utils/mobileApiClient';

// Auto-mock mobileApiClient (picks up __mocks__/mobileApiClient.ts)
jest.mock('../../utils/mobileApiClient');

// Mock the logger so error/warn paths don't go through @mintenance/shared.
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { logger } from '../../utils/logger';

const api = mobileApiClient as jest.Mocked<typeof mobileApiClient>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

beforeEach(() => {
  jest.clearAllMocks();
  // Re-establish default resolved values cleared by clearAllMocks.
  api.get.mockResolvedValue({} as never);
  api.post.mockResolvedValue({} as never);
  api.put.mockResolvedValue({} as never);
  api.patch.mockResolvedValue({} as never);
  api.delete.mockResolvedValue({} as never);
});

// ---------------------------------------------------------------------------
// Facade wiring
// ---------------------------------------------------------------------------
describe('QuoteBuilderService facade', () => {
  it('exposes all static methods', () => {
    expect(typeof QuoteBuilderService.createQuoteTemplate).toBe('function');
    expect(typeof QuoteBuilderService.getQuoteTemplates).toBe('function');
    expect(typeof QuoteBuilderService.getQuoteTemplate).toBe('function');
    expect(typeof QuoteBuilderService.getQuoteTemplateLineItems).toBe(
      'function'
    );
    expect(typeof QuoteBuilderService.updateQuoteTemplate).toBe('function');
    expect(typeof QuoteBuilderService.deleteQuoteTemplate).toBe('function');
    expect(typeof QuoteBuilderService.createQuote).toBe('function');
    expect(typeof QuoteBuilderService.getQuotes).toBe('function');
    expect(typeof QuoteBuilderService.getQuote).toBe('function');
    expect(typeof QuoteBuilderService.getQuoteLineItems).toBe('function');
    expect(typeof QuoteBuilderService.updateQuote).toBe('function');
    expect(typeof QuoteBuilderService.sendQuote).toBe('function');
    expect(typeof QuoteBuilderService.duplicateQuote).toBe('function');
    expect(typeof QuoteBuilderService.deleteQuote).toBe('function');
    expect(typeof QuoteBuilderService.generateQuotePDF).toBe('function');
    expect(typeof QuoteBuilderService.trackQuoteInteraction).toBe('function');
    expect(typeof QuoteBuilderService.getQuoteSummaryStats).toBe('function');
    expect(typeof QuoteBuilderService.getQuoteRevisions).toBe('function');
    expect(typeof QuoteBuilderService.createQuoteRevision).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// TemplateCRUD
// ---------------------------------------------------------------------------
describe('Template CRUD', () => {
  describe('createQuoteTemplate', () => {
    it('maps template data and line items to the API payload', async () => {
      const template = { id: 't-1', template_name: 'Boiler service' };
      api.post.mockResolvedValueOnce({ template } as never);

      const result = await QuoteBuilderService.createQuoteTemplate('c-1', {
        template_name: 'Boiler service',
        description: 'Annual service',
        terms_and_conditions: 'Net 30',
        line_items: [
          {
            item_name: 'Labour',
            item_description: 'Engineer time',
            default_quantity: 2,
            unit_price: 50,
            unit: 'hour',
            category: 'labour',
            is_taxable: true,
            sort_order: 0,
          },
        ],
      });

      expect(result).toBe(template);
      expect(api.post).toHaveBeenCalledWith('/api/contractor/quote-templates', {
        name: 'Boiler service',
        description: 'Annual service',
        line_items: [
          {
            description: 'Engineer time',
            quantity: 2,
            unit_price: 50,
            unit: 'hour',
            category: 'labour',
          },
        ],
        terms: 'Net 30',
        notes: null,
      });
    });

    it('handles templates without line items (undefined branch)', async () => {
      api.post.mockResolvedValueOnce({ template: { id: 't-2' } } as never);

      await QuoteBuilderService.createQuoteTemplate('c-1', {
        template_name: 'Empty',
      });

      const payload = api.post.mock.calls[0][1] as { line_items?: unknown };
      expect(payload.line_items).toBeUndefined();
    });

    it('throws and logs on API failure', async () => {
      api.post.mockRejectedValueOnce(new Error('boom'));

      await expect(
        QuoteBuilderService.createQuoteTemplate('c-1', { template_name: 'x' })
      ).rejects.toThrow('Failed to create quote template');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error creating quote template',
        expect.any(Error),
        { service: 'quote-builder' }
      );
    });
  });

  describe('getQuoteTemplates', () => {
    it('returns templates from the response', async () => {
      const templates = [{ id: 't-1' }, { id: 't-2' }];
      api.get.mockResolvedValueOnce({ templates } as never);

      const result = await QuoteBuilderService.getQuoteTemplates('c-1');
      expect(result).toBe(templates);
      expect(api.get).toHaveBeenCalledWith('/api/contractor/quote-templates');
    });

    it('returns empty array when response has no templates (|| [] branch)', async () => {
      api.get.mockResolvedValueOnce({} as never);
      const result = await QuoteBuilderService.getQuoteTemplates('c-1');
      expect(result).toEqual([]);
    });

    it('throws on API failure', async () => {
      api.get.mockRejectedValueOnce(new Error('net'));
      await expect(
        QuoteBuilderService.getQuoteTemplates('c-1')
      ).rejects.toThrow('Failed to fetch quote templates');
      expect(mockedLogger.error).toHaveBeenCalled();
    });
  });

  describe('getQuoteTemplate', () => {
    it('finds a matching template by id', async () => {
      api.get.mockResolvedValueOnce({
        templates: [{ id: 'a' }, { id: 'b' }],
      } as never);

      const result = await QuoteBuilderService.getQuoteTemplate('b');
      expect(result).toEqual({ id: 'b' });
    });

    it('returns null when not found (?? null branch)', async () => {
      api.get.mockResolvedValueOnce({ templates: [{ id: 'a' }] } as never);
      const result = await QuoteBuilderService.getQuoteTemplate('zzz');
      expect(result).toBeNull();
    });

    it('throws when the underlying fetch fails', async () => {
      api.get.mockRejectedValueOnce(new Error('net'));
      await expect(QuoteBuilderService.getQuoteTemplate('b')).rejects.toThrow(
        'Failed to fetch quote template'
      );
    });
  });

  describe('getQuoteTemplateLineItems', () => {
    it('projects line items off the parent template', async () => {
      api.get.mockResolvedValueOnce({
        templates: [{ id: 't-1', line_items: [{ id: 'li-1' }] }],
      } as never);

      const result = await QuoteBuilderService.getQuoteTemplateLineItems('t-1');
      expect(result).toEqual([{ id: 'li-1' }]);
    });

    it('returns empty array when template has no line items (?? [] branch)', async () => {
      api.get.mockResolvedValueOnce({
        templates: [{ id: 't-1' }],
      } as never);

      const result = await QuoteBuilderService.getQuoteTemplateLineItems('t-1');
      expect(result).toEqual([]);
    });

    it('returns empty array when template not found (null template)', async () => {
      api.get.mockResolvedValueOnce({ templates: [] } as never);
      const result =
        await QuoteBuilderService.getQuoteTemplateLineItems('nope');
      expect(result).toEqual([]);
    });

    it('throws on failure', async () => {
      api.get.mockRejectedValueOnce(new Error('net'));
      await expect(
        QuoteBuilderService.getQuoteTemplateLineItems('t-1')
      ).rejects.toThrow('Failed to fetch template line items');
    });
  });

  describe('updateQuoteTemplate', () => {
    it('sends update payload to the per-id endpoint', async () => {
      const template = { id: 't-1', template_name: 'Updated' };
      api.put.mockResolvedValueOnce({ template } as never);

      const result = await QuoteBuilderService.updateQuoteTemplate('t-1', {
        template_name: 'Updated',
        description: 'desc',
        terms_and_conditions: 'terms',
      });

      expect(result).toBe(template);
      expect(api.put).toHaveBeenCalledWith(
        '/api/contractor/quote-templates/t-1',
        { name: 'Updated', description: 'desc', terms: 'terms', notes: null }
      );
    });

    it('throws on failure', async () => {
      api.put.mockRejectedValueOnce(new Error('net'));
      await expect(
        QuoteBuilderService.updateQuoteTemplate('t-1', {})
      ).rejects.toThrow('Failed to update quote template');
    });
  });

  describe('deleteQuoteTemplate', () => {
    it('calls DELETE on the per-id endpoint', async () => {
      api.delete.mockResolvedValueOnce(undefined as never);
      await QuoteBuilderService.deleteQuoteTemplate('t-1');
      expect(api.delete).toHaveBeenCalledWith(
        '/api/contractor/quote-templates/t-1'
      );
    });

    it('throws on failure', async () => {
      api.delete.mockRejectedValueOnce(new Error('net'));
      await expect(
        QuoteBuilderService.deleteQuoteTemplate('t-1')
      ).rejects.toThrow('Failed to delete quote template');
    });
  });
});

// ---------------------------------------------------------------------------
// QuoteCRUD
// ---------------------------------------------------------------------------
describe('Quote CRUD', () => {
  describe('createQuote (totals maths)', () => {
    const baseLineItems = [
      {
        item_name: 'Labour',
        quantity: 2,
        unit_price: 100,
        unit: 'hour',
        category: 'labour',
        is_taxable: true,
        sort_order: 0,
      },
      {
        item_name: 'Parts',
        quantity: 1,
        unit_price: 50,
        unit: 'each',
        category: 'materials',
        is_taxable: true,
        sort_order: 1,
      },
    ];

    it('computes subtotal, VAT @20% default, and total with no markup/discount', async () => {
      api.post
        .mockResolvedValueOnce({ quote: { id: 'q-1' } } as never) // create
        .mockResolvedValueOnce({} as never); // analytics

      await QuoteBuilderService.createQuote('c-1', {
        client_name: 'Jane',
        client_email: 'jane@example.com',
        project_title: 'Kitchen',
        line_items: baseLineItems,
      });

      // subtotal = 2*100 + 1*50 = 250; no markup/discount; VAT 20% = 50; total = 300
      const payload = api.post.mock.calls[0][1] as {
        subtotal: number;
        taxRate: number;
        taxAmount: number;
        totalAmount: number;
        lineItems: Array<{ subtotal: number }>;
      };
      expect(payload.subtotal).toBe(250);
      expect(payload.taxRate).toBe(0.2);
      expect(payload.taxAmount).toBeCloseTo(50, 5);
      expect(payload.totalAmount).toBeCloseTo(300, 5);
      // per-line subtotals attached
      expect(payload.lineItems[0].subtotal).toBe(200);
      expect(payload.lineItems[1].subtotal).toBe(50);
    });

    it('applies markup and discount before VAT', async () => {
      api.post
        .mockResolvedValueOnce({ quote: { id: 'q-2' } } as never)
        .mockResolvedValueOnce({} as never);

      await QuoteBuilderService.createQuote('c-1', {
        client_name: 'Jane',
        client_email: 'jane@example.com',
        project_title: 'Bathroom',
        markup_percentage: 10,
        discount_percentage: 5,
        line_items: baseLineItems,
      });

      // subtotal=250; +10% markup => 275; -5% discount => 13.75 off => taxable 261.25
      // VAT 20% => 52.25; total => 313.5
      const payload = api.post.mock.calls[0][1] as {
        subtotal: number;
        taxAmount: number;
        totalAmount: number;
      };
      expect(payload.subtotal).toBe(250);
      expect(payload.taxAmount).toBeCloseTo(52.25, 5);
      expect(payload.totalAmount).toBeCloseTo(313.5, 5);
    });

    it('honours a custom tax_rate', async () => {
      api.post
        .mockResolvedValueOnce({ quote: { id: 'q-3' } } as never)
        .mockResolvedValueOnce({} as never);

      await QuoteBuilderService.createQuote('c-1', {
        client_name: 'Jane',
        client_email: 'jane@example.com',
        project_title: 'Roof',
        tax_rate: 0.05,
        line_items: [
          {
            item_name: 'Tile',
            quantity: 4,
            unit_price: 25,
            unit: 'each',
            category: 'materials',
            is_taxable: true,
            sort_order: 0,
          },
        ],
      });

      // subtotal = 100; VAT 5% = 5; total = 105
      const payload = api.post.mock.calls[0][1] as {
        subtotal: number;
        taxRate: number;
        taxAmount: number;
        totalAmount: number;
      };
      expect(payload.subtotal).toBe(100);
      expect(payload.taxRate).toBe(0.05);
      expect(payload.taxAmount).toBeCloseTo(5, 5);
      expect(payload.totalAmount).toBeCloseTo(105, 5);
    });

    it('fires analytics with the created interaction', async () => {
      api.post
        .mockResolvedValueOnce({ quote: { id: 'q-4' } } as never)
        .mockResolvedValueOnce({} as never);

      const quote = await QuoteBuilderService.createQuote('contractor-x', {
        client_name: 'Jane',
        client_email: 'jane@example.com',
        project_title: 'Job',
        line_items: baseLineItems,
      });

      expect(quote).toEqual({ id: 'q-4' });
      expect(api.post).toHaveBeenNthCalledWith(
        2,
        '/api/contractor/quotes/q-4/analytics',
        {
          interaction_type: 'created',
          metadata: { contractor_id: 'contractor-x' },
        }
      );
    });

    it('swallows analytics failure but still returns the quote (warn branch)', async () => {
      api.post
        .mockResolvedValueOnce({ quote: { id: 'q-5' } } as never)
        .mockRejectedValueOnce(new Error('analytics down'));

      const quote = await QuoteBuilderService.createQuote('c-1', {
        client_name: 'Jane',
        client_email: 'jane@example.com',
        project_title: 'Job',
        line_items: baseLineItems,
      });

      expect(quote).toEqual({ id: 'q-5' });
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Failed to create quote analytics',
        expect.objectContaining({ service: 'quote-builder' })
      );
    });

    it('throws when the create call fails', async () => {
      api.post.mockRejectedValueOnce(new Error('create failed'));

      await expect(
        QuoteBuilderService.createQuote('c-1', {
          client_name: 'Jane',
          client_email: 'jane@example.com',
          project_title: 'Job',
          line_items: baseLineItems,
        })
      ).rejects.toThrow('Failed to create quote');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error creating quote',
        expect.any(Error),
        { service: 'quote-builder' }
      );
    });
  });

  describe('getQuotes', () => {
    it('fetches all quotes with no filter', async () => {
      api.get.mockResolvedValueOnce({ quotes: [{ id: 'a' }] } as never);
      const result = await QuoteBuilderService.getQuotes('c-1');
      expect(result).toEqual([{ id: 'a' }]);
      expect(api.get).toHaveBeenCalledWith('/api/contractor/quotes');
    });

    it('appends a single status filter', async () => {
      api.get.mockResolvedValueOnce({ quotes: [] } as never);
      await QuoteBuilderService.getQuotes('c-1', { status: ['sent'] });
      expect(api.get).toHaveBeenCalledWith(
        '/api/contractor/quotes?status=sent'
      );
    });

    it('fans out and merges when multiple statuses are passed', async () => {
      api.get
        .mockResolvedValueOnce({ quotes: [{ id: 'a' }] } as never)
        .mockResolvedValueOnce({ quotes: [{ id: 'b' }] } as never);

      const result = await QuoteBuilderService.getQuotes('c-1', {
        status: ['sent', 'accepted'],
      });

      expect(result).toEqual([{ id: 'a' }, { id: 'b' }]);
      expect(api.get).toHaveBeenCalledWith(
        '/api/contractor/quotes?status=sent'
      );
      expect(api.get).toHaveBeenCalledWith(
        '/api/contractor/quotes?status=accepted'
      );
    });

    it('defaults missing quotes arrays to [] in the fan-out merge', async () => {
      api.get
        .mockResolvedValueOnce({} as never)
        .mockResolvedValueOnce({ quotes: [{ id: 'b' }] } as never);

      const result = await QuoteBuilderService.getQuotes('c-1', {
        status: ['sent', 'accepted'],
      });
      expect(result).toEqual([{ id: 'b' }]);
    });

    it('returns [] when single-fetch response has no quotes (?? [] branch)', async () => {
      api.get.mockResolvedValueOnce({} as never);
      const result = await QuoteBuilderService.getQuotes('c-1');
      expect(result).toEqual([]);
    });

    it('throws on failure', async () => {
      api.get.mockRejectedValueOnce(new Error('net'));
      await expect(QuoteBuilderService.getQuotes('c-1')).rejects.toThrow(
        'Failed to fetch quotes'
      );
    });
  });

  describe('getQuote', () => {
    it('finds the quote by id from the list', async () => {
      api.get.mockResolvedValueOnce({
        quotes: [{ id: 'a' }, { id: 'b' }],
      } as never);
      const result = await QuoteBuilderService.getQuote('b');
      expect(result).toEqual({ id: 'b' });
    });

    it('returns null when not found (?? null branch)', async () => {
      api.get.mockResolvedValueOnce({ quotes: [{ id: 'a' }] } as never);
      const result = await QuoteBuilderService.getQuote('zzz');
      expect(result).toBeNull();
    });

    it('returns null when response has no quotes array', async () => {
      api.get.mockResolvedValueOnce({} as never);
      const result = await QuoteBuilderService.getQuote('a');
      expect(result).toBeNull();
    });

    it('throws on failure', async () => {
      api.get.mockRejectedValueOnce(new Error('net'));
      await expect(QuoteBuilderService.getQuote('a')).rejects.toThrow(
        'Failed to fetch quote'
      );
    });
  });

  describe('getQuoteLineItems', () => {
    it('returns embedded line items from the quote', async () => {
      api.get.mockResolvedValueOnce({
        quotes: [{ id: 'q-1', line_items: [{ id: 'li-1' }] }],
      } as never);
      const result = await QuoteBuilderService.getQuoteLineItems('q-1');
      expect(result).toEqual([{ id: 'li-1' }]);
    });

    it('returns [] when quote has no line items (|| [] branch)', async () => {
      api.get.mockResolvedValueOnce({ quotes: [{ id: 'q-1' }] } as never);
      const result = await QuoteBuilderService.getQuoteLineItems('q-1');
      expect(result).toEqual([]);
    });

    it('returns [] when quote not found', async () => {
      api.get.mockResolvedValueOnce({ quotes: [] } as never);
      const result = await QuoteBuilderService.getQuoteLineItems('nope');
      expect(result).toEqual([]);
    });

    it('throws on failure', async () => {
      api.get.mockRejectedValueOnce(new Error('net'));
      await expect(
        QuoteBuilderService.getQuoteLineItems('q-1')
      ).rejects.toThrow('Failed to fetch quote line items');
    });
  });

  describe('updateQuote', () => {
    it('sends update payload and tracks "shared" when status changes', async () => {
      api.put.mockResolvedValueOnce({ quote: { id: 'q-1' } } as never);
      api.post.mockResolvedValueOnce({} as never); // trackQuoteInteraction

      const result = await QuoteBuilderService.updateQuote('q-1', {
        title: 'New title',
        client_name: 'Bob',
        total_amount: 500,
        status: 'accepted',
        terms: 'terms',
        notes: 'notes',
        valid_until: '2026-12-31',
      });

      expect(result).toEqual({ id: 'q-1' });
      expect(api.put).toHaveBeenCalledWith('/api/contractor/quotes/q-1', {
        title: 'New title',
        client_name: 'Bob',
        total_amount: 500,
        status: 'accepted',
        line_items: undefined,
        terms: 'terms',
        notes: 'notes',
        valid_until: '2026-12-31',
      });
      // analytics interaction fired because status was set
      expect(api.post).toHaveBeenCalledWith(
        '/api/contractor/quotes/q-1/analytics',
        expect.objectContaining({ interaction_type: 'shared' })
      );
    });

    it('does NOT track interaction when status is absent (if branch false)', async () => {
      api.put.mockResolvedValueOnce({ quote: { id: 'q-1' } } as never);
      await QuoteBuilderService.updateQuote('q-1', { title: 'No status' });
      expect(api.post).not.toHaveBeenCalled();
    });

    it('throws on failure', async () => {
      api.put.mockRejectedValueOnce(new Error('net'));
      await expect(
        QuoteBuilderService.updateQuote('q-1', { title: 'x' })
      ).rejects.toThrow('Failed to update quote');
    });
  });

  describe('sendQuote', () => {
    it('sends the quote and tracks "sent"', async () => {
      api.post
        .mockResolvedValueOnce({ quote: { id: 'q-1' } } as never) // send-quote
        .mockResolvedValueOnce({} as never); // analytics

      const result = await QuoteBuilderService.sendQuote('q-1');
      expect(result).toEqual({ id: 'q-1' });
      expect(api.post).toHaveBeenNthCalledWith(
        1,
        '/api/contractor/send-quote',
        { quoteId: 'q-1' }
      );
      expect(api.post).toHaveBeenNthCalledWith(
        2,
        '/api/contractor/quotes/q-1/analytics',
        { interaction_type: 'sent', metadata: undefined }
      );
    });

    it('throws on failure', async () => {
      api.post.mockRejectedValueOnce(new Error('net'));
      await expect(QuoteBuilderService.sendQuote('q-1')).rejects.toThrow(
        'Failed to send quote'
      );
    });
  });
});

// ---------------------------------------------------------------------------
// QuoteOperations
// ---------------------------------------------------------------------------
describe('Quote operations', () => {
  describe('duplicateQuote', () => {
    it('copies a quote with "(Copy)" suffixes and re-creates it', async () => {
      const original = {
        id: 'q-1',
        contractor_id: 'c-1',
        client_name: 'Jane',
        client_email: 'jane@example.com',
        client_phone: '07000',
        project_title: 'Kitchen',
        project_description: 'desc',
        job_id: 'job-1',
        template_id: 'tpl-1',
        markup_percentage: 10,
        discount_percentage: 0,
        tax_rate: 0.2,
        terms_and_conditions: 'terms',
        notes: 'notes',
        line_items: [
          {
            item_name: 'Labour',
            item_description: 'time',
            quantity: 2,
            unit_price: 100,
            unit: 'hour',
            category: 'labour',
            is_taxable: true,
            sort_order: 0,
          },
        ],
      };
      // getQuote (list) -> twice (duplicateQuote calls getQuote + getQuoteLineItems, both list)
      api.get
        .mockResolvedValueOnce({ quotes: [original] } as never) // getQuote
        .mockResolvedValueOnce({ quotes: [original] } as never); // getQuoteLineItems
      api.post
        .mockResolvedValueOnce({ quote: { id: 'q-copy' } } as never) // createQuote
        .mockResolvedValueOnce({} as never); // analytics

      const result = await QuoteBuilderService.duplicateQuote('q-1');
      expect(result).toEqual({ id: 'q-copy' });

      const createPayload = api.post.mock.calls[0][1] as {
        title: string;
        clientName: string;
      };
      expect(createPayload.clientName).toBe('Jane (Copy)');
      expect(createPayload.title).toBe('Kitchen (Copy)');
    });

    it('throws "Failed to duplicate quote" when original is not found', async () => {
      api.get.mockResolvedValueOnce({ quotes: [] } as never);
      await expect(QuoteBuilderService.duplicateQuote('nope')).rejects.toThrow(
        'Failed to duplicate quote'
      );
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error duplicating quote',
        expect.any(Error),
        { service: 'quote-builder' }
      );
    });

    it('throws when underlying fetch errors', async () => {
      api.get.mockRejectedValueOnce(new Error('net'));
      await expect(QuoteBuilderService.duplicateQuote('q-1')).rejects.toThrow(
        'Failed to duplicate quote'
      );
    });
  });

  describe('deleteQuote', () => {
    it('calls DELETE on the per-id endpoint', async () => {
      api.delete.mockResolvedValueOnce(undefined as never);
      await QuoteBuilderService.deleteQuote('q-1');
      expect(api.delete).toHaveBeenCalledWith('/api/contractor/quotes/q-1');
    });

    it('throws on failure', async () => {
      api.delete.mockRejectedValueOnce(new Error('net'));
      await expect(QuoteBuilderService.deleteQuote('q-1')).rejects.toThrow(
        'Failed to delete quote'
      );
    });
  });

  describe('generateQuotePDF', () => {
    it('returns a PDF string referencing the quote number', async () => {
      const quote = { id: 'q-1', quote_number: 'QT-100', line_items: [] };
      api.get
        .mockResolvedValueOnce({ quotes: [quote] } as never) // getQuote
        .mockResolvedValueOnce({ quotes: [quote] } as never); // getQuoteLineItems
      api.post.mockResolvedValueOnce({} as never); // trackQuoteInteraction

      const result = await QuoteBuilderService.generateQuotePDF('q-1');
      expect(result).toBe('Generated PDF for quote QT-100');
      expect(api.post).toHaveBeenCalledWith(
        '/api/contractor/quotes/q-1/analytics',
        expect.objectContaining({ interaction_type: 'downloaded' })
      );
    });

    it('throws "Failed to generate quote PDF" when quote not found', async () => {
      api.get.mockResolvedValueOnce({ quotes: [] } as never);
      await expect(
        QuoteBuilderService.generateQuotePDF('nope')
      ).rejects.toThrow('Failed to generate quote PDF');
    });

    it('throws on fetch failure', async () => {
      api.get.mockRejectedValueOnce(new Error('net'));
      await expect(QuoteBuilderService.generateQuotePDF('q-1')).rejects.toThrow(
        'Failed to generate quote PDF'
      );
    });
  });
});

// ---------------------------------------------------------------------------
// QuoteAnalytics
// ---------------------------------------------------------------------------
describe('Quote analytics', () => {
  describe('trackQuoteInteraction', () => {
    it('posts the interaction with details metadata', async () => {
      api.post.mockResolvedValueOnce({} as never);
      await QuoteBuilderService.trackQuoteInteraction('q-1', 'viewed', {
        foo: 'bar',
      });
      expect(api.post).toHaveBeenCalledWith(
        '/api/contractor/quotes/q-1/analytics',
        { interaction_type: 'viewed', metadata: { foo: 'bar' } }
      );
    });

    it('uses undefined metadata when details omitted (|| undefined branch)', async () => {
      api.post.mockResolvedValueOnce({} as never);
      await QuoteBuilderService.trackQuoteInteraction('q-1', 'sent');
      expect(api.post).toHaveBeenCalledWith(
        '/api/contractor/quotes/q-1/analytics',
        { interaction_type: 'sent', metadata: undefined }
      );
    });

    it('swallows errors (no throw) and logs them', async () => {
      api.post.mockRejectedValueOnce(new Error('net'));
      await expect(
        QuoteBuilderService.trackQuoteInteraction('q-1', 'viewed')
      ).resolves.toBeUndefined();
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error tracking quote interaction',
        expect.any(Error),
        { service: 'quote-builder' }
      );
    });
  });

  describe('getQuoteSummaryStats', () => {
    it('maps API stats onto the legacy summary shape with computed rates', async () => {
      api.get.mockResolvedValueOnce({
        stats: {
          total: 10,
          draft: 2,
          sent: 5,
          accepted: 4,
          declined: 1,
          totalRevenue: 4000,
        },
        quotes: [{ amount: 1000 }, { amount: 2000 }, { amount: 500 }],
      } as never);

      const stats = await QuoteBuilderService.getQuoteSummaryStats('c-1');
      expect(stats).toEqual({
        total_quotes: 10,
        draft_quotes: 2,
        sent_quotes: 5,
        accepted_quotes: 4,
        rejected_quotes: 1,
        total_value: 3500, // 1000+2000+500
        accepted_value: 4000,
        average_quote_value: 350, // 3500/10
        acceptance_rate: 80, // 4/5*100
        conversion_rate: 40, // 4/10*100
      });
    });

    it('handles missing quotes array and zero divisors (else branches)', async () => {
      api.get.mockResolvedValueOnce({
        stats: {
          total: 0,
          draft: 0,
          sent: 0,
          accepted: 0,
          declined: 0,
          totalRevenue: 0,
        },
      } as never);

      const stats = await QuoteBuilderService.getQuoteSummaryStats('c-1');
      expect(stats.total_value).toBe(0);
      expect(stats.average_quote_value).toBe(0); // total === 0 branch
      expect(stats.acceptance_rate).toBe(0); // sent === 0 branch
      expect(stats.conversion_rate).toBe(0); // total === 0 branch
    });

    it('defaults a missing amount to 0 in the reduce', async () => {
      api.get.mockResolvedValueOnce({
        stats: {
          total: 2,
          draft: 0,
          sent: 2,
          accepted: 1,
          declined: 0,
          totalRevenue: 100,
        },
        quotes: [{ amount: 100 }, {}],
      } as never);

      const stats = await QuoteBuilderService.getQuoteSummaryStats('c-1');
      expect(stats.total_value).toBe(100); // 100 + 0
    });

    it('throws on failure', async () => {
      api.get.mockRejectedValueOnce(new Error('net'));
      await expect(
        QuoteBuilderService.getQuoteSummaryStats('c-1')
      ).rejects.toThrow('Failed to fetch quote summary stats');
    });
  });
});

// ---------------------------------------------------------------------------
// QuoteRevisions (deferred no-op feature)
// ---------------------------------------------------------------------------
describe('Quote revisions (deferred stub)', () => {
  it('getQuoteRevisions resolves to an empty array', async () => {
    const result = await QuoteBuilderService.getQuoteRevisions('q-1');
    expect(result).toEqual([]);
  });

  it('createQuoteRevision returns a deferred placeholder shape', async () => {
    const rev = await QuoteBuilderService.createQuoteRevision(
      'q-1',
      'Adjusted labour',
      250,
      300,
      'user-1'
    );
    expect(rev).toEqual({
      id: 'deferred',
      quote_id: 'q-1',
      changes_summary: 'Adjusted labour',
      previous_total: 250,
      new_total: 300,
      revised_by: 'user-1',
      created_at: new Date(0).toISOString(),
    });
  });

  it('warns at most once per process across revision calls', async () => {
    // The module-level `_warned` flag means warnDeferred fires only on the
    // first revision call in this process. Both calls above already ran, so
    // exactly one warn should have been recorded for the "deferred feature"
    // message.
    await QuoteBuilderService.getQuoteRevisions('q-2');
    await QuoteBuilderService.createQuoteRevision('q-2', 's', 1, 2, 'u');

    const deferredWarns = mockedLogger.warn.mock.calls.filter((c) =>
      String(c[0]).includes('deferred feature called')
    );
    expect(deferredWarns.length).toBeLessThanOrEqual(1);
  });
});
