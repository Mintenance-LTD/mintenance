# Service Layer Organization

## Overview

The service layer has been restructured to improve maintainability, modularity, and code quality. This document outlines the organizational patterns and best practices for the Mintenance app services.

## Service Architecture Principles

### 1. Single Responsibility Principle
Each service class handles one specific domain or business capability:
- `AuthService` - Authentication and user session management
- `JobService` - Job posting, management, and workflows
- `MessagingService` - Real-time messaging and communications
- `UserService` - User profile and account management

### 2. Error Handling Standardization
All services use the standardized `ServiceErrorHandler` for consistent:
- Error logging and tracking
- User-friendly error messages
- Context-aware error handling
- Validation patterns

### 3. Modular Organization
Large service files (1000+ lines) are split into focused modules:

```
src/services/
├── contractor-business/           # Business management modules
│   ├── types.ts                  # Shared type definitions
│   ├── BusinessAnalyticsService.ts
│   ├── FinancialManagementService.ts
│   └── index.ts                  # Unified interface
├── AuthService.ts                # Core authentication
├── JobService.ts                 # Job management
├── MessagingService.ts           # Messaging
└── serviceErrorHandler.ts        # Standardized error handling
```

## Service Patterns

### 1. Service Method Structure
```typescript
static async methodName(params: Type): Promise<ReturnType> {
  const context = {
    service: 'ServiceName',
    method: 'methodName',
    userId: userId,
    params: { key: value },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    // Validation
    ServiceErrorHandler.validateRequired(param, 'Field name', context);

    // Business logic
    const { data, error } = await supabase.operation();

    if (error) {
      throw ServiceErrorHandler.handleDatabaseError(error, context);
    }

    return data;
  }, context);

  if (!result.success || !result.data) {
    throw new Error('Operation failed');
  }

  return result.data;
}
```

### 2. Error Handling Patterns
- **Database Errors**: Use `ServiceErrorHandler.handleDatabaseError()`
- **Network Errors**: Use `ServiceErrorHandler.handleNetworkError()`
- **Validation Errors**: Use `ServiceErrorHandler.validateRequired()`, `validateEmail()`, etc.
- **Operation Wrapping**: Always use `ServiceErrorHandler.executeOperation()`

### 3. Logging Standards
- Use `logger` instead of `console.log`
- Include context and relevant data
- Use appropriate log levels (info, warn, error)

## Modular Services

### Contractor Business Suite
The large `ContractorBusinessSuite.ts` (1171 lines) has been split into focused modules:

#### BusinessAnalyticsService
- Business metrics calculation
- Financial summaries
- Client analytics
- Marketing insights

#### FinancialManagementService
- Invoice creation and management
- Expense tracking
- Payment recording
- Financial calculations

#### Unified Interface
```typescript
import { ContractorBusinessSuite } from './contractor-business';

// Use specific modules
ContractorBusinessSuite.analytics.calculateBusinessMetrics();
ContractorBusinessSuite.finance.createInvoice();
```

## Migration Guide

### For Existing Code
1. Update imports to use new modular structure
2. Replace direct error throwing with `ServiceErrorHandler`
3. Add proper validation and context
4. Update logging to use `logger`

### Example Migration
**Before:**
```typescript
static async createJob(data) {
  if (!data.title) throw new Error('Title required');

  const { data: result, error } = await supabase.insert(data);
  if (error) throw new Error(error.message);

  console.log('Job created');
  return result;
}
```

**After:**
```typescript
static async createJob(data) {
  const context = {
    service: 'JobService',
    method: 'createJob',
    userId: data.homeownerId,
    params: { title: data.title?.substring(0, 50) },
  };

  const result = await ServiceErrorHandler.executeOperation(async () => {
    ServiceErrorHandler.validateRequired(data.title, 'Title', context);

    const { data: result, error } = await supabase.insert(data);
    if (error) {
      throw ServiceErrorHandler.handleDatabaseError(error, context);
    }

    logger.info('Job created successfully', { jobId: result.id });
    return result;
  }, context);

  if (!result.success || !result.data) {
    throw new Error('Failed to create job');
  }

  return result.data;
}
```

## File Size Guidelines

### Target Sizes
- **Small Services**: < 300 lines
- **Medium Services**: 300-500 lines
- **Large Services**: 500-800 lines
- **Should Split**: > 800 lines

### Large Files Identified (Need Splitting)
1. `RealMLService.ts` (1186 lines) - AI/ML services
2. `JobSheetsService.ts` (1179 lines) - Job documentation
3. `MLTrainingPipeline.ts` (975 lines) - ML training
4. `SSOIntegrationService.ts` (974 lines) - SSO integration
5. `AIPricingEngine.ts` (925 lines) - Pricing algorithms

## Best Practices

### 1. Service Design
- Keep services focused on single domain
- Use composition over inheritance
- Implement consistent interfaces
- Follow naming conventions

### 2. Error Handling
- Always provide user context
- Log technical details separately
- Use appropriate error categories
- Include error recovery options

### 3. Testing
- Write unit tests for each service method
- Mock external dependencies
- Test error scenarios
- Validate error handling

### 4. Documentation
- Document service interfaces
- Provide usage examples
- Explain business logic
- Maintain architectural decisions

## Future Improvements

### Phase 3 Targets
1. Split remaining large services
2. Implement service interfaces
3. Add comprehensive testing
4. Performance optimization
5. Monitoring and observability

### Service Boundaries
Consider extracting shared concerns:
- Caching layer
- Rate limiting
- Audit logging
- Data validation
- Business rules engine

## Usage Examples

### Business Analytics
```typescript
import { ContractorBusinessSuite } from './contractor-business';

// Calculate metrics
const metrics = await ContractorBusinessSuite.analytics
  .calculateBusinessMetrics(contractorId, startDate, endDate);

// Generate financial summary
const financials = await ContractorBusinessSuite.analytics
  .generateFinancialSummary(contractorId);
```

### Financial Management
```typescript
// Create invoice
const invoice = await ContractorBusinessSuite.finance
  .createInvoice(invoiceData);

// Record expense
const expense = await ContractorBusinessSuite.finance
  .recordExpense(expenseData);

// Calculate totals
const totals = await ContractorBusinessSuite.finance
  .calculateFinancialTotals(contractorId, startDate, endDate);
```

This organization ensures maintainable, scalable, and robust service layer architecture for the Mintenance application.