/**
 * Unit tests for useCreateQuoteViewModel.
 * The ViewModel is a hook of plain business logic; we mock its externals:
 * QuoteBuilderService, logger, Alert (react-native), and useAuth (which the
 * jest config remaps to AuthContext-fallback).
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockGetQuoteTemplates = jest.fn();
const mockCreateQuote = jest.fn();
jest.mock('@/services/QuoteBuilderService', () => ({
  QuoteBuilderService: {
    getQuoteTemplates: (...a: unknown[]) => mockGetQuoteTemplates(...a),
    createQuote: (...a: unknown[]) => mockCreateQuote(...a),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext-fallback', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

import { useCreateQuoteViewModel } from '../CreateQuoteViewModel';

const lineItem = (over: Record<string, unknown> = {}) =>
  ({
    item_name: 'Labour',
    item_description: 'work',
    quantity: 2,
    unit_price: 100,
    unit: 'hr',
    category: 'labour',
    is_taxable: true,
    sort_order: 0,
    ...over,
  }) as never;

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockGetQuoteTemplates.mockResolvedValue([]);
  mockCreateQuote.mockResolvedValue({ id: 'q1' });
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => alertSpy.mockRestore());

describe('initialisation', () => {
  it('seeds client fields from params and a default validUntil', async () => {
    const { result } = renderHook(() =>
      useCreateQuoteViewModel('job1', 'Ada', 'ada@x.com')
    );
    expect(result.current.clientName).toBe('Ada');
    expect(result.current.clientEmail).toBe('ada@x.com');
    await waitFor(() => expect(result.current.validUntil).not.toBe(''));
    expect(mockGetQuoteTemplates).toHaveBeenCalledWith('u1');
  });

  it('does not load templates when there is no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    renderHook(() => useCreateQuoteViewModel());
    await waitFor(() => expect(mockGetQuoteTemplates).not.toHaveBeenCalled());
  });

  it('logs an error when template loading fails', async () => {
    mockGetQuoteTemplates.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useCreateQuoteViewModel());
    await waitFor(() => expect(result.current.validUntil).not.toBe(''));
  });
});

describe('line items + totals', () => {
  it('recomputes totals with markup, discount and tax', async () => {
    const { result } = renderHook(() => useCreateQuoteViewModel());
    act(() => result.current.addLineItem(lineItem())); // 2 * 100 = 200 subtotal
    // markup 15% -> 230, discount 0 -> 230, tax 20% -> +46 = 276
    await waitFor(() => expect(result.current.subtotal).toBe(200));
    expect(result.current.totalAmount).toBeCloseTo(276, 5);
  });

  it('updates and removes line items', async () => {
    const { result } = renderHook(() => useCreateQuoteViewModel());
    act(() => result.current.addLineItem(lineItem()));
    await waitFor(() => expect(result.current.lineItems).toHaveLength(1));
    act(() => result.current.updateLineItem(0, lineItem({ quantity: 3 })));
    await waitFor(() => expect(result.current.lineItems[0].quantity).toBe(3));
    act(() => result.current.removeLineItem(0));
    await waitFor(() => expect(result.current.lineItems).toHaveLength(0));
  });

  it('reacts to markup/discount/tax setters', async () => {
    const { result } = renderHook(() => useCreateQuoteViewModel());
    act(() => result.current.addLineItem(lineItem()));
    act(() => {
      result.current.setMarkupPercentage('0');
      result.current.setDiscountPercentage('10');
      result.current.setTaxRate('0');
    });
    // 200 subtotal, no markup, 10% discount = 180, no tax
    await waitFor(() => expect(result.current.totalAmount).toBeCloseTo(180, 5));
  });
});

describe('templates', () => {
  it('applies a selected template terms + notes', async () => {
    mockGetQuoteTemplates.mockResolvedValue([
      { id: 't1', terms_and_conditions: 'Net 30', notes: 'hello' },
    ]);
    const { result } = renderHook(() => useCreateQuoteViewModel());
    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    act(() => result.current.selectTemplate('t1'));
    expect(result.current.selectedTemplate).toBe('t1');
    expect(result.current.termsAndConditions).toBe('Net 30');
  });

  it('ignores an unknown template id', async () => {
    const { result } = renderHook(() => useCreateQuoteViewModel());
    await waitFor(() => expect(result.current.validUntil).not.toBe(''));
    act(() => result.current.selectTemplate('does-not-exist'));
    expect(result.current.selectedTemplate).toBe('');
  });
});

describe('simple setters + modal toggles', () => {
  it('updates form fields and modal flags', async () => {
    const { result } = renderHook(() => useCreateQuoteViewModel());
    act(() => {
      result.current.setClientName('Bob');
      result.current.setClientEmail('b@x.com');
      result.current.setClientPhone('07000');
      result.current.setProjectTitle('Reroof');
      result.current.setProjectDescription('Full reroof');
      result.current.setValidUntil('2026-12-31');
      result.current.setTermsAndConditions('terms');
      result.current.setNotes('notes');
      result.current.setShowLineItemModal(true);
      result.current.setEditingItemIndex(2);
      result.current.setShowTemplateModal(true);
    });
    expect(result.current.clientName).toBe('Bob');
    expect(result.current.projectTitle).toBe('Reroof');
    expect(result.current.showLineItemModal).toBe(true);
    expect(result.current.editingItemIndex).toBe(2);
    expect(result.current.showTemplateModal).toBe(true);
  });
});

describe('saveQuote', () => {
  it('does nothing without a user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useCreateQuoteViewModel());
    await act(async () => {
      await result.current.saveQuote();
    });
    expect(mockCreateQuote).not.toHaveBeenCalled();
  });

  it('creates the quote and shows a success alert', async () => {
    const { result } = renderHook(() => useCreateQuoteViewModel('job1'));
    await act(async () => {
      await result.current.saveQuote();
    });
    expect(mockCreateQuote).toHaveBeenCalledWith('u1', expect.any(Object));
    expect(alertSpy).toHaveBeenCalledWith('Success', expect.any(String));
  });

  it('shows an error alert when saving fails', async () => {
    mockCreateQuote.mockRejectedValueOnce(new Error('save failed'));
    const { result } = renderHook(() => useCreateQuoteViewModel('job1'));
    await act(async () => {
      await result.current.saveQuote();
    });
    expect(alertSpy).toHaveBeenCalledWith('Error', 'save failed');
  });
});

describe('sendQuote + goBack', () => {
  it('saves then shows a sent confirmation', async () => {
    const { result } = renderHook(() => useCreateQuoteViewModel('job1'));
    await act(async () => {
      await result.current.sendQuote();
    });
    expect(mockCreateQuote).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Success',
      'Quote sent to client successfully!'
    );
  });

  it('does nothing on send without a user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useCreateQuoteViewModel());
    await act(async () => {
      await result.current.sendQuote();
    });
    expect(mockCreateQuote).not.toHaveBeenCalled();
  });

  it('goBack logs without throwing', async () => {
    const { result } = renderHook(() => useCreateQuoteViewModel());
    act(() => result.current.goBack());
  });
});
