# Session 2: Financial Services Implementation Plan

**Date**: 2026-01-23
**Services**: FinancialManagementService + EscrowService
**Status**: Analysis Complete, Ready for Implementation
**Estimated Time**: 4-5 hours

---

## FINANCIALMANAGEMENTSERVICE ANALYSIS ✅

### Service Overview (VERIFIED)

**File**: `apps/mobile/src/services/contractor-business/FinancialManagementService.ts`
**Total Lines**: 752
**Testable Lines**: ~208
**Current Coverage**: 0%
**Target Coverage**: 70% (~145 lines)
**Business Criticality**: CRITICAL (handles money, invoices, payments, taxes)

### What This Service Does

Critical financial operations for contractors:
- **Invoice Management**: Create, update status, auto-generate numbers
- **Expense Tracking**: Record business expenses (tax deductible)
- **Payment Recording**: Track payments, auto-update invoice status to 'paid'
- **Financial Analytics**: Revenue, profit, outstanding, overdue calculations
- **Tax Reporting**: Expense categories, tax obligations
- **Cash Flow**: Forecasting (currently mock implementation)

---

## PUBLIC METHODS (12 methods, 208 testable lines)

### Critical Money-Handling Methods

| Method | Lines | Criticality | What It Does |
|--------|-------|-------------|--------------|
| `createInvoice` | 15-53 | HIGH | Create financial records |
| `updateInvoiceStatus` | 58-104 | HIGH | Change payment state, set paid_date |
| `recordExpense` | 161-199 | HIGH | Track business expenses (tax implications) |
| `recordPayment` | 261-302 | CRITICAL | Record payment, auto-update invoice to 'paid' |
| `calculateFinancialTotals` | 307-388 | HIGH | Revenue/profit/outstanding calculations |
| `generateInvoiceNumber` | 449-466 | MEDIUM | Sequential invoice numbers (INV-2026-001) |

### Query & Reporting Methods

| Method | Lines | Criticality | What It Does |
|--------|-------|-------------|--------------|
| `getInvoices` | 109-156 | MEDIUM | Retrieve with filters (status, date range) |
| `getExpenses` | 204-256 | MEDIUM | Retrieve with filters (category, tax deductible) |
| `sendInvoice` | 393-444 | HIGH | Email invoice, update status to 'sent' |
| `getFinancialSummary` | 471-539 | HIGH | Dashboard data (monthly, quarterly, yearly) |
| `getExpenseCategories` | 564-622 | MEDIUM | Category aggregations for tax reporting |

### Utility Methods

| Method | Lines | Criticality | What It Does |
|--------|-------|-------------|--------------|
| `calculateDueDate` | 544-559 | MEDIUM | Payment terms → due date calculation |

---

## CRITICAL BUSINESS LOGIC (Must Test)

### 1. Money Calculations (Lines 366-372)
```typescript
// CRITICAL: Revenue, expense, profit totals
const revenue = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
const expenses = expensesData.reduce((sum, exp) => sum + (exp.amount || 0), 0);
const profit = revenue - expenses;

const outstanding = outstandingInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
const overdue = outstandingInvoices.filter(inv => new Date(inv.due_date) < now)
  .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
```

**Risks**:
- Wrong calculations = incorrect financial reports
- Null/undefined arrays crash app
- Missing invoices/expenses = under-reported revenue

### 2. Payment Recording → Invoice Status Update (Lines 290-292)
```typescript
// CRITICAL: Auto-update invoice to 'paid' when payment recorded
if (paymentData.invoice_id) {
  await this.updateInvoiceStatus(paymentData.invoice_id, 'paid', paymentData.contractor_id);
}
```

**Risks**:
- Failure to update = invoices marked paid but status still 'sent'
- Wrong invoice_id = payment to wrong invoice
- No error handling = silent failures

### 3. Auto-Set Paid Date (Lines 80-82)
```typescript
// CRITICAL: Set paid_date when status becomes 'paid'
const updateData = {
  status,
  ...(status === 'paid' && { paid_date: new Date().toISOString() }),
  updated_at: new Date().toISOString(),
};
```

**Risks**:
- Missing paid_date = payment tracking broken
- Wrong timestamp format = date parsing errors
- Overwrites existing paid_date on re-updates

### 4. Invoice Number Generation (Lines 462-465)
```typescript
// CRITICAL: Sequential invoice numbers
const prefix = `INV-${new Date().getFullYear()}-`;
const sequence = lastInvoiceNumber
  ? parseInt(lastInvoiceNumber.split('-')[2]) + 1
  : 1;
return `${prefix}${sequence.toString().padStart(3, '0')}`;
```

**Risks**:
- Duplicate numbers = accounting chaos
- Wrong parsing = INV-2026-NaN
- Race conditions = two invoices same number

---

## DEPENDENCIES MAP

### External Dependencies (Must Mock)
- **Supabase** (`supabase`): Database operations
  - Tables: `invoices`, `expenses`, `payments`, `users`
  - Query chain: `.from().select().eq().order().single()`
- **ServiceErrorHandler** (`../../utils/serviceErrorHandler`):
  - `executeOperation()`: Wraps async operations
  - `validateRequired()`: Field validation
  - `validatePositiveNumber()`: Amount validation
  - `handleDatabaseError()`: Error handling
- **logger** (`../../utils/logger`): Logging

### Internal Dependencies
- **Types**: `Invoice`, `ExpenseRecord`, `PaymentRecord`, `InvoiceLineItem`

---

## TEST FILE STATUS

**Path**: `apps/mobile/src/services/contractor-business/__tests__/FinancialManagementService.test.ts`
**Current Tests**: 3 placeholder tests (no real coverage)
**Structure**: Mocks are set up, need to add test cases

---

## IMPLEMENTATION PLAN (70% Coverage)

### Phase 1: Core CRUD Operations (~40 lines, 19% coverage)
**Time**: 1-1.5 hours

1. **createInvoice - happy path**
   - Test: Valid invoice creation with line items
   - Verifies: Supabase insert called with correct data
   - Lines covered: 23-46

2. **createInvoice - validation failures**
   - Test: Missing required fields (contractor_id, client_id, invoice_number)
   - Test: Negative total_amount
   - Lines covered: 24-27

3. **updateInvoiceStatus - to 'paid'**
   - Test: Update draft → paid, verifies paid_date set
   - Verifies: UPDATE query has paid_date
   - Lines covered: 75-96

4. **recordExpense - happy path**
   - Test: Valid expense with tax_deductible=true
   - Verifies: Supabase insert called
   - Lines covered: 169-192

5. **recordPayment - with invoice_id**
   - Test: Payment recorded, invoice updated to 'paid'
   - Verifies: recordPayment calls updateInvoiceStatus
   - Lines covered: 269-294

### Phase 2: Financial Calculations (~50 lines, 43% cumulative)
**Time**: 1-1.5 hours

6. **calculateFinancialTotals - normal period**
   - Test: Revenue, expenses, profit calculation
   - Mock: Paid invoices = $5000, expenses = $1200
   - Expect: profit = $3800
   - Lines covered: 325-380

7. **calculateFinancialTotals - with overdue invoices**
   - Test: Outstanding invoices, some overdue
   - Mock: 2 invoices outstanding, 1 past due_date
   - Expect: outstanding = $2000, overdue = $500
   - Lines covered: 371-372

8. **generateInvoiceNumber - first invoice**
   - Test: No previous invoices
   - Expect: 'INV-2026-001'
   - Lines covered: 458-459

9. **generateInvoiceNumber - increment existing**
   - Test: Last invoice = 'INV-2026-042'
   - Expect: 'INV-2026-043'
   - Lines covered: 462-465

### Phase 3: Query Operations (~30 lines, 57% cumulative)
**Time**: 45 min - 1 hour

10. **getInvoices - with status filter**
    - Test: Filter by status='paid'
    - Verifies: Supabase .eq('status', 'paid') called
    - Lines covered: 131-133

11. **getInvoices - with date range filter**
    - Test: Filter by dateFrom/dateTo
    - Verifies: Supabase .gte() and .lte() called
    - Lines covered: 134-140

12. **getExpenses - with tax_deductible filter**
    - Test: Filter tax_deductible=true
    - Verifies: Supabase .eq('tax_deductible', true)
    - Lines covered: 238-240

13. **getExpenseCategories - aggregation**
    - Test: Multiple expenses in different categories
    - Expect: Correct totals per category
    - Lines covered: 596-609

### Phase 4: Edge Cases & Error Paths (~25 lines, 70%+ cumulative)
**Time**: 45 min - 1 hour

14. **Negative amount validation**
    - Test: createInvoice with negative total_amount
    - Test: recordExpense with negative amount
    - Expect: Validation error thrown
    - Lines covered: 27, 172

15. **Database errors**
    - Test: Supabase returns error object
    - Expect: ServiceErrorHandler.handleDatabaseError called
    - Lines covered: 41-43, 92-94

16. **Empty result handling**
    - Test: getInvoices returns empty array
    - Test: getExpenses returns empty array
    - Expect: Return [] not null/undefined
    - Lines covered: 148, 255

---

## MOCK DATA (Copy-Paste Ready)

```typescript
const mockInvoice = {
  id: 'inv-123',
  contractor_id: 'contractor-123',
  client_id: 'client-123',
  invoice_number: 'INV-2026-001',
  status: 'draft' as const,
  total_amount: 1500.00,
  subtotal: 1500.00,
  tax_amount: 0,
  line_items: [{
    description: 'Bathroom renovation',
    quantity: 1,
    rate: 1500,
    amount: 1500
  }],
  issue_date: '2026-01-15',
  due_date: '2026-02-14',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
};

const mockExpense = {
  id: 'exp-123',
  contractor_id: 'contractor-123',
  category: 'Tools',
  amount: 250.00,
  description: 'New drill purchase',
  date: '2026-01-15',
  tax_deductible: true,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
};

const mockPayment = {
  id: 'pay-123',
  contractor_id: 'contractor-123',
  invoice_id: 'inv-123',
  amount: 1500.00,
  payment_method: 'credit_card',
  payment_date: '2026-01-20',
  created_at: '2026-01-20T10:00:00Z',
};
```

---

## MOCK SETUP PATTERN

```typescript
// Mock Supabase
const mockSupabaseChain = {
  from: jest.fn(() => mockSupabaseChain),
  select: jest.fn(() => mockSupabaseChain),
  insert: jest.fn(() => mockSupabaseChain),
  update: jest.fn(() => mockSupabaseChain),
  eq: jest.fn(() => mockSupabaseChain),
  gte: jest.fn(() => mockSupabaseChain),
  lte: jest.fn(() => mockSupabaseChain),
  order: jest.fn(() => mockSupabaseChain),
  single: jest.fn(() => ({ data: mockInvoice, error: null })),
};

jest.mock('../../config/supabase', () => ({
  supabase: mockSupabaseChain,
}));

// Mock ServiceErrorHandler
jest.mock('../../utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    executeOperation: jest.fn(async (operation) => {
      const data = await operation();
      return { success: true, data };
    }),
    validateRequired: jest.fn(),
    validatePositiveNumber: jest.fn(),
    handleDatabaseError: jest.fn((err) => err),
  },
}));
```

---

## VERIFICATION CHECKLIST

After implementation:
- [ ] Run: `npm test -- FinancialManagementService.test.ts --coverage`
- [ ] Verify: Coverage >70% lines
- [ ] Verify: All 16 tests passing
- [ ] Check: No console errors about money calculations
- [ ] Run: Full coverage report to see actual %
- [ ] Commit with evidence (test output, coverage %)

---

## ESCROWSERVICE (Next)

**Path**: `apps/mobile/src/services/EscrowService.ts`
**Lines**: 40 (much smaller!)
**Current Coverage**: 0%
**Target**: 80% (~32 lines)
**Estimated Time**: 2-3 hours

**Note**: Will analyze after FinancialManagementService is complete.

---

## TOTAL SESSION 2 ESTIMATE

| Task | Time | Coverage Gain |
|------|------|---------------|
| FinancialManagementService | 3.5-4.5 hours | +145 lines |
| EscrowService | 2-3 hours | +32 lines |
| **TOTAL** | **5.5-7.5 hours** | **+177 lines** |

**Expected Overall Coverage**: 8.47% → 11-13%

---

## NEXT STEPS

1. **Implement Phase 1-4 tests** for FinancialManagementService
2. **Verify coverage** reaches 70%+
3. **Commit with evidence**
4. **Analyze EscrowService**
5. **Implement EscrowService tests**
6. **Final verification** and session summary

---

**Status**: Ready to begin implementation
**Confidence Level**: HIGH (clear plan, verified data, similar patterns exist)
