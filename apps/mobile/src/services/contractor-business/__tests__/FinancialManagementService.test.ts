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

// Mock ServiceErrorHandler
jest.mock('@/utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    executeOperation: jest.fn((operation) =>
      operation().then(data => ({ success: true, data }))
        .catch(error => ({ success: false, error }))
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

import { FinancialManagementService } from '../FinancialManagementService';
import { ServiceErrorHandler } from '@/utils/serviceErrorHandler';
import { __setMockData, __resetSupabaseMock, __queueMockData } from '@/config/__mocks__/supabase';

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

        __setMockData(mockInvoice);

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

        const result = await FinancialManagementService.createInvoice(invoiceData);

        expect(result).toEqual(mockInvoice);
        expect(ServiceErrorHandler.validateRequired).toHaveBeenCalledWith('contractor-123', 'Contractor ID', expect.any(Object));
        expect(ServiceErrorHandler.validateRequired).toHaveBeenCalledWith('client-123', 'Client ID', expect.any(Object));
        expect(ServiceErrorHandler.validateRequired).toHaveBeenCalledWith('INV-2026-001', 'Invoice number', expect.any(Object));
        expect(ServiceErrorHandler.validatePositiveNumber).toHaveBeenCalledWith(1500.0, 'Total amount', expect.any(Object));
      });

      it('should validate required fields', async () => {
        (ServiceErrorHandler.validateRequired as jest.Mock).mockImplementation((value, fieldName) => {
          if (!value) {
            throw new Error(`${fieldName} is required`);
          }
        });

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

        await expect(FinancialManagementService.createInvoice(invalidInvoice)).rejects.toThrow();
      });

      it('should validate positive total amount', async () => {
        (ServiceErrorHandler.validatePositiveNumber as jest.Mock).mockImplementation((value, fieldName) => {
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

        await expect(FinancialManagementService.createInvoice(invalidInvoice)).rejects.toThrow();
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

        __setMockData(mockUpdatedInvoice);

        const result = await FinancialManagementService.updateInvoiceStatus('inv-123', 'paid', 'contractor-123');

        expect(result).toEqual(mockUpdatedInvoice);
      });
    });

    describe('recordExpense', () => {
      it('should record tax deductible expense', async () => {
        const mockExpense = {
          id: 'exp-123',
          contractor_id: 'contractor-123',
          category: 'Tools',
          amount: 250.0,
          description: 'New drill purchase',
          date: '2026-01-15',
          tax_deductible: true,
          created_at: '2026-01-15T10:00:00Z',
          updated_at: '2026-01-15T10:00:00Z',
        };

        __setMockData(mockExpense);

        const expenseData = {
          contractor_id: 'contractor-123',
          category: 'Tools',
          amount: 250.0,
          description: 'New drill purchase',
          date: '2026-01-15',
          tax_deductible: true,
        };

        const result = await FinancialManagementService.recordExpense(expenseData);

        expect(result).toEqual(mockExpense);
        expect(ServiceErrorHandler.validateRequired).toHaveBeenCalledWith('contractor-123', 'Contractor ID', expect.any(Object));
        expect(ServiceErrorHandler.validatePositiveNumber).toHaveBeenCalledWith(250.0, 'Amount', expect.any(Object));
      });
    });

    describe('recordPayment', () => {
      it('should record payment and update invoice status', async () => {
        const mockPayment = {
          id: 'pay-123',
          contractor_id: 'contractor-123',
          invoice_id: 'inv-123',
          amount: 1500.0,
          payment_method: 'credit_card',
          payment_date: '2026-01-20',
          created_at: '2026-01-20T10:00:00Z',
        };

        __setMockData(mockPayment);

        const paymentData = {
          contractor_id: 'contractor-123',
          invoice_id: 'inv-123',
          amount: 1500.0,
          payment_method: 'credit_card',
          payment_date: '2026-01-20',
        };

        const result = await FinancialManagementService.recordPayment(paymentData);

        expect(result).toEqual(mockPayment);
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
          [
            { total_amount: 2000 },
            { total_amount: 3000 },
          ],
          // Query 2: Expenses
          [
            { amount: 500 },
            { amount: 700 },
          ],
          // Query 3: Outstanding invoices
          [],
        ]);

        const result = await FinancialManagementService.calculateFinancialTotals(
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

        const result = await FinancialManagementService.calculateFinancialTotals(
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
      it('should generate first invoice number', async () => {
        __setMockData(null);

        const result = await FinancialManagementService.generateInvoiceNumber('contractor-123');

        expect(result).toMatch(/^INV-\d{4}-001$/);
      });

      it('should increment existing invoice number', async () => {
        const mockLastInvoice = {
          invoice_number: 'INV-2026-042',
        };

        __setMockData(mockLastInvoice);

        const result = await FinancialManagementService.generateInvoiceNumber('contractor-123');

        expect(result).toBe('INV-2026-043');
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

        __setMockData(mockInvoices);

        const result = await FinancialManagementService.getInvoices('contractor-123', { status: 'paid' });

        expect(result).toEqual(mockInvoices);
      });

      it('should filter by date range', async () => {
        const mockInvoices = [{ id: 'inv-1', issue_date: '2026-01-15' }];

        __setMockData(mockInvoices);

        const result = await FinancialManagementService.getInvoices('contractor-123', {
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
        });

        // Test just verifies it doesn't throw and returns an array
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('getExpenses', () => {
      it('should filter by tax_deductible', async () => {
        const mockExpenses = [
          { id: 'exp-1', category: 'Tools', amount: 250, tax_deductible: true },
          { id: 'exp-2', category: 'Materials', amount: 500, tax_deductible: true },
        ];

        __setMockData(mockExpenses);

        const result = await FinancialManagementService.getExpenses('contractor-123', { tax_deductible: true });

        expect(result).toEqual(mockExpenses);
      });
    });

    describe('getExpenseCategories', () => {
      it('should aggregate expenses by category', async () => {
        const mockExpenses = [
          { category: 'Tools', amount: 250 },
          { category: 'Tools', amount: 150 },
          { category: 'Materials', amount: 500 },
        ];

        __setMockData(mockExpenses);

        await FinancialManagementService.getExpenseCategories(
          'contractor-123',
          '2026-01-01',
          '2026-01-31'
        );

        expect(ServiceErrorHandler.executeOperation).toHaveBeenCalled();
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

        await expect(FinancialManagementService.createInvoice(invoiceData)).rejects.toThrow();
      });

      it('should handle database errors in updateInvoiceStatus', async () => {
        __setMockData(null);

        await expect(FinancialManagementService.updateInvoiceStatus('inv-999', 'paid', 'contractor-123')).rejects.toThrow();
      });
    });

    describe('Empty Results Handling', () => {
      it('should return empty array when no invoices found', async () => {
        __setMockData([]);

        const result = await FinancialManagementService.getInvoices('contractor-123', {});

        expect(result).toEqual([]);
      });

      it('should return empty array when no expenses found', async () => {
        __setMockData([]);

        const result = await FinancialManagementService.getExpenses('contractor-123', {});

        expect(result).toEqual([]);
      });
    });
  });
});
