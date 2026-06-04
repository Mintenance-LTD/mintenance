/**
 * FinancialManagementService facade tests.
 *
 * Realigned 2026-06-04 to the current implementation. The invoice/expense
 * mutation + list methods were migrated off direct Supabase to the web API
 * via mobileApiClient (audit P0-1, 2026-04-30):
 *   createInvoice       -> POST  /api/contractor/invoices
 *   updateInvoiceStatus -> PATCH /api/contractor/invoices?id=
 *   recordExpense       -> POST  /api/contractor/expenses
 *   getInvoices         -> GET   /api/contractor/invoices
 *   getExpenses         -> GET   /api/contractor/expenses
 * The financial *aggregations* (calculateFinancialTotals / getFinancialSummary)
 * intentionally keep direct read-only Supabase queries, so the calc tests still
 * drive the supabase queue mock.
 *
 * Two impl changes the old suite hadn't caught up to:
 *   - recordPayment() now throws by design (no canonical payment API yet; use
 *     the Stripe pay route or updateInvoiceStatus(id,'paid')). Asserting the
 *     guard rather than a fabricated success.
 *   - generateInvoiceNumber() returns a server-authoritative `INV-YYYY-DRAFT`
 *     placeholder; the server stamps the real sequence on POST.
 */
import { FinancialManagementService } from '../FinancialManagementService';
import { ServiceErrorHandler } from '@/utils/serviceErrorHandler';
import { mobileApiClient } from '@/utils/mobileApiClient';
import {
  __setMockData,
  __resetSupabaseMock,
  __queueMockData,
} from '@/config/__mocks__/supabase';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Manual mock at src/utils/__mocks__/mobileApiClient.ts
jest.mock('@/utils/mobileApiClient');
const mockedApiClient = mobileApiClient as jest.Mocked<typeof mobileApiClient>;

// Mock ServiceErrorHandler
jest.mock('@/utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    executeOperation: jest.fn((operation) =>
      operation()
        .then((data) => ({ success: true, data }))
        .catch((error) => ({ success: false, error }))
    ),
    validateRequired: jest.fn(),
    validatePositiveNumber: jest.fn(),
    handleDatabaseError: jest.fn((err) => err),
  },
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('FinancialManagementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetSupabaseMock();
  });

  // =====================================================
  // PHASE 1: CORE CRUD OPERATIONS
  // =====================================================

  describe('Phase 1: Core CRUD Operations', () => {
    describe('createInvoice', () => {
      it('should create invoice with valid data', async () => {
        const mockInvoice = {
          id: 'inv-123',
          contractor_id: 'contractor-123',
          client_id: 'client-123',
          invoice_number: 'INV-2026-001',
          status: 'draft' as const,
          total_amount: 1500.0,
          subtotal: 1500.0,
          tax_amount: 0,
          line_items: [
            {
              description: 'Bathroom renovation',
              quantity: 1,
              rate: 1500,
              amount: 1500,
            },
          ],
          issue_date: '2026-01-15',
          due_date: '2026-02-14',
          created_at: '2026-01-15T10:00:00Z',
          updated_at: '2026-01-15T10:00:00Z',
        };

        mockedApiClient.post.mockResolvedValueOnce({
          success: true,
          invoice: mockInvoice,
        });

        const invoiceData = {
          contractor_id: 'contractor-123',
          client_id: 'client-123',
          invoice_number: 'INV-2026-001',
          status: 'draft' as const,
          total_amount: 1500.0,
          subtotal: 1500.0,
          tax_amount: 0,
          line_items: [
            {
              description: 'Bathroom renovation',
              quantity: 1,
              rate: 1500,
              amount: 1500,
            },
          ],
          issue_date: '2026-01-15',
          due_date: '2026-02-14',
        };

        const result =
          await FinancialManagementService.createInvoice(invoiceData);

        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/api/contractor/invoices',
          expect.any(Object)
        );
        expect(result).toEqual(mockInvoice);
        expect(ServiceErrorHandler.validateRequired).toHaveBeenCalledWith(
          'contractor-123',
          'Contractor ID',
          expect.any(Object)
        );
        // client_id is optional since audit-17 (2026-05-23); validation is on
        // total_amount, not invoice_number (server stamps the number).
        expect(ServiceErrorHandler.validatePositiveNumber).toHaveBeenCalledWith(
          1500.0,
          'Total amount',
          expect.any(Object)
        );
      });

      it('should validate required fields', async () => {
        (ServiceErrorHandler.validateRequired as jest.Mock).mockImplementation(
          (value, fieldName) => {
            if (!value) {
              throw new Error(`${fieldName} is required`);
            }
          }
        );

        const invalidInvoice = {
          contractor_id: '',
          client_id: 'client-123',
          invoice_number: 'INV-2026-001',
          status: 'draft' as const,
          total_amount: 1500.0,
          subtotal: 1500.0,
          tax_amount: 0,
          line_items: [],
          issue_date: '2026-01-15',
          due_date: '2026-02-14',
        };

        await expect(
          FinancialManagementService.createInvoice(invalidInvoice)
        ).rejects.toThrow();
      });

      it('should validate positive total amount', async () => {
        (
          ServiceErrorHandler.validatePositiveNumber as jest.Mock
        ).mockImplementation((value, fieldName) => {
          if (value <= 0) {
            throw new Error(`${fieldName} must be positive`);
          }
        });

        const invalidInvoice = {
          contractor_id: 'contractor-123',
          client_id: 'client-123',
          invoice_number: 'INV-2026-001',
          status: 'draft' as const,
          total_amount: -100,
          subtotal: 1500.0,
          tax_amount: 0,
          line_items: [],
          issue_date: '2026-01-15',
          due_date: '2026-02-14',
        };

        await expect(
          FinancialManagementService.createInvoice(invalidInvoice)
        ).rejects.toThrow();
      });
    });

    describe('updateInvoiceStatus', () => {
      it('should update status to paid and set paid_date', async () => {
        const mockUpdatedInvoice = {
          id: 'inv-123',
          contractor_id: 'contractor-123',
          client_id: 'client-123',
          invoice_number: 'INV-2026-001',
          status: 'paid' as const,
          total_amount: 1500.0,
          subtotal: 1500.0,
          tax_amount: 0,
          line_items: [],
          issue_date: '2026-01-15',
          due_date: '2026-02-14',
          paid_date: '2026-01-20T10:00:00Z',
          created_at: '2026-01-15T10:00:00Z',
          updated_at: '2026-01-20T10:00:00Z',
        };

        mockedApiClient.patch.mockResolvedValueOnce({
          success: true,
          invoice: mockUpdatedInvoice,
        });

        const result = await FinancialManagementService.updateInvoiceStatus(
          'inv-123',
          'paid',
          'contractor-123'
        );

        expect(mockedApiClient.patch).toHaveBeenCalledWith(
          expect.stringContaining('/api/contractor/invoices?id=inv-123'),
          expect.objectContaining({ status: 'paid' })
        );
        expect(result).toEqual(mockUpdatedInvoice);
      });
    });

    describe('recordExpense', () => {
      it('should record tax deductible expense', async () => {
        // API returns an ApiExpense; recordExpense maps it to ExpenseRecord
        // (tax_deductible is reconstructed from the `tax-deductible` tag).
        mockedApiClient.post.mockResolvedValueOnce({
          expense: {
            id: 'exp-123',
            description: 'New drill purchase',
            category: 'tools',
            amount: 250.0,
            date: '2026-01-15',
            jobId: null,
            paymentMethod: 'card',
            receiptUrl: null,
            tags: ['tax-deductible'],
            isBillable: false,
            notes: null,
            createdAt: '2026-01-15T10:00:00Z',
          },
        });

        const expenseData = {
          contractor_id: 'contractor-123',
          category: 'tools',
          amount: 250.0,
          description: 'New drill purchase',
          date: '2026-01-15',
          tax_deductible: true,
        };

        const result =
          await FinancialManagementService.recordExpense(expenseData);

        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/api/contractor/expenses',
          expect.objectContaining({ tags: ['tax-deductible'] })
        );
        expect(result).toMatchObject({
          id: 'exp-123',
          contractor_id: 'contractor-123',
          amount: 250.0,
          description: 'New drill purchase',
          tax_deductible: true,
        });
        expect(ServiceErrorHandler.validateRequired).toHaveBeenCalledWith(
          'contractor-123',
          'Contractor ID',
          expect.any(Object)
        );
        expect(ServiceErrorHandler.validatePositiveNumber).toHaveBeenCalledWith(
          250.0,
          'Amount',
          expect.any(Object)
        );
      });
    });

    describe('recordPayment', () => {
      // recordPayment() has no canonical API yet and intentionally throws,
      // directing callers to the Stripe pay route or updateInvoiceStatus.
      // Asserting the guard rather than fabricating a success path.
      it('should throw directing callers to the supported payment paths', async () => {
        const paymentData = {
          contractor_id: 'contractor-123',
          invoice_id: 'inv-123',
          amount: 1500.0,
          payment_method: 'credit_card',
          payment_date: '2026-01-20',
        };

        await expect(
          FinancialManagementService.recordPayment(paymentData)
        ).rejects.toThrow(/no canonical API/i);
      });
    });
  });

  // =====================================================
  // PHASE 2: FINANCIAL CALCULATIONS
  // =====================================================

  describe('Phase 2: Financial Calculations', () => {
    describe('calculateFinancialTotals', () => {
      it('should calculate revenue, expenses, and profit correctly', async () => {
        // calculateFinancialTotals makes 3 sequential database queries:
        // 1. Get paid invoices for revenue
        // 2. Get expenses
        // 3. Get outstanding invoices
        __queueMockData([
          // Query 1: Paid invoices (revenue calculation)
          [{ total_amount: 2000 }, { total_amount: 3000 }],
          // Query 2: Expenses
          [{ amount: 500 }, { amount: 700 }],
          // Query 3: Outstanding invoices
          [],
        ]);

        const result =
          await FinancialManagementService.calculateFinancialTotals(
            'contractor-123',
            '2026-01-01',
            '2026-01-31'
          );

        expect(result.totalRevenue).toBe(5000); // 2000 + 3000
        expect(result.totalExpenses).toBe(1200); // 500 + 700
        expect(result.totalProfit).toBe(3800); // 5000 - 1200
        expect(result.outstandingInvoices).toBe(0); // Empty array
        expect(result.overdueAmount).toBe(0); // No overdue
      });

      it('should calculate outstanding and overdue amounts', async () => {
        const today = new Date().toISOString();
        const yesterday = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

        __queueMockData([
          // Query 1: Paid invoices (empty for this test)
          [],
          // Query 2: Expenses (empty for this test)
          [],
          // Query 3: Outstanding invoices (2 outstanding, 1 overdue)
          [
            { total_amount: 1000, due_date: '2026-12-31', status: 'sent' }, // Future - not overdue
            { total_amount: 1500, due_date: '2026-12-31', status: 'sent' }, // Future - not overdue
            { total_amount: 500, due_date: yesterday, status: 'overdue' }, // Overdue
          ],
        ]);

        const result =
          await FinancialManagementService.calculateFinancialTotals(
            'contractor-123',
            '2026-01-01',
            '2026-01-31'
          );

        expect(result.totalRevenue).toBe(0);
        expect(result.totalExpenses).toBe(0);
        expect(result.totalProfit).toBe(0);
        expect(result.outstandingInvoices).toBe(3000); // 1000 + 1500 + 500
        expect(result.overdueAmount).toBe(500); // Only the overdue one
      });
    });

    describe('generateInvoiceNumber', () => {
      // Server now stamps the canonical sequence on POST; the client returns
      // an `INV-YYYY-DRAFT` placeholder purely for the pre-submit UI preview.
      it('should return a server-authoritative DRAFT placeholder', async () => {
        const result =
          await FinancialManagementService.generateInvoiceNumber(
            'contractor-123'
          );

        expect(result).toMatch(/^INV-\d{4}-DRAFT$/);
      });
    });
  });

  // =====================================================
  // PHASE 3: QUERY OPERATIONS
  // =====================================================

  describe('Phase 3: Query Operations', () => {
    describe('getInvoices', () => {
      it('should filter by status', async () => {
        const mockInvoices = [
          { id: 'inv-1', status: 'paid', total_amount: 1000 },
          { id: 'inv-2', status: 'paid', total_amount: 2000 },
        ];

        mockedApiClient.get.mockResolvedValueOnce({ invoices: mockInvoices });

        const result = await FinancialManagementService.getInvoices(
          'contractor-123',
          { status: 'paid' }
        );

        expect(mockedApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('status=paid')
        );
        expect(result).toEqual(mockInvoices);
      });

      it('should filter by date range', async () => {
        mockedApiClient.get.mockResolvedValueOnce({
          invoices: [{ id: 'inv-1', issue_date: '2026-01-15' }],
        });

        const result = await FinancialManagementService.getInvoices(
          'contractor-123',
          {
            dateFrom: '2026-01-01',
            dateTo: '2026-01-31',
          }
        );

        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('getExpenses', () => {
      it('should map API expenses and reconstruct tax_deductible from tags', async () => {
        mockedApiClient.get.mockResolvedValueOnce({
          expenses: [
            {
              id: 'exp-1',
              description: 'Drill',
              category: 'tools',
              amount: 250,
              date: '2026-01-15',
              jobId: null,
              paymentMethod: 'card',
              receiptUrl: null,
              tags: ['tax-deductible'],
              isBillable: false,
              notes: null,
              createdAt: '2026-01-15T10:00:00Z',
            },
          ],
        });

        const result = await FinancialManagementService.getExpenses(
          'contractor-123',
          { taxDeductible: true }
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          id: 'exp-1',
          contractor_id: 'contractor-123',
          amount: 250,
          tax_deductible: true,
        });
      });
    });

    describe('getExpenseCategories', () => {
      it('should aggregate expenses by category from the API source', async () => {
        mockedApiClient.get.mockResolvedValueOnce({
          expenses: [
            {
              id: 'e1',
              description: 'Drill',
              category: 'tools',
              amount: 250,
              date: '2026-01-15',
              jobId: null,
              paymentMethod: 'card',
              receiptUrl: null,
              tags: [],
              isBillable: false,
              notes: null,
              createdAt: '2026-01-15T10:00:00Z',
            },
            {
              id: 'e2',
              description: 'Saw',
              category: 'tools',
              amount: 150,
              date: '2026-01-16',
              jobId: null,
              paymentMethod: 'card',
              receiptUrl: null,
              tags: [],
              isBillable: false,
              notes: null,
              createdAt: '2026-01-16T10:00:00Z',
            },
          ],
        });

        const result =
          await FinancialManagementService.getExpenseCategories(
            'contractor-123'
          );

        expect(result).toEqual([
          expect.objectContaining({
            category: 'tools',
            totalAmount: 400,
            count: 2,
          }),
        ]);
      });
    });
  });

  // =====================================================
  // PHASE 4: EDGE CASES & ERROR PATHS
  // =====================================================

  describe('Phase 4: Edge Cases & Error Handling', () => {
    describe('Error Handling', () => {
      it('should handle database errors in createInvoice', async () => {
        __setMockData(null);

        const invoiceData = {
          contractor_id: 'contractor-123',
          client_id: 'client-123',
          invoice_number: 'INV-2026-001',
          status: 'draft' as const,
          total_amount: 1500.0,
          subtotal: 1500.0,
          tax_amount: 0,
          line_items: [],
          issue_date: '2026-01-15',
          due_date: '2026-02-14',
        };

        await expect(
          FinancialManagementService.createInvoice(invoiceData)
        ).rejects.toThrow();
      });

      it('should handle database errors in updateInvoiceStatus', async () => {
        __setMockData(null);

        await expect(
          FinancialManagementService.updateInvoiceStatus(
            'inv-999',
            'paid',
            'contractor-123'
          )
        ).rejects.toThrow();
      });
    });

    describe('Empty Results Handling', () => {
      it('should return empty array when no invoices found', async () => {
        __setMockData([]);

        const result = await FinancialManagementService.getInvoices(
          'contractor-123',
          {}
        );

        expect(result).toEqual([]);
      });

      it('should return empty array when no expenses found', async () => {
        __setMockData([]);

        const result = await FinancialManagementService.getExpenses(
          'contractor-123',
          {}
        );

        expect(result).toEqual([]);
      });
    });
  });
});
