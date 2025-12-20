# Debug Logging Guidelines

## Overview

This document defines standards for debugging and logging in the Mintenance codebase. All logging must use the centralized logger from `@mintenance/shared` instead of `console.*` statements.

## Core Principles

### 1. Use Structured Logging

Always use the logger from `@mintenance/shared` with structured context objects:

```typescript
import { logger } from '@mintenance/shared';

// ✅ DO - Structured logging with context
logger.debug('[ComponentName] State:', {
  isDisabled: isInputDisabled,
  isLoading: isLoading,
  hasImage: hasCurrentImage,
});

// ❌ DON'T - Console statements
console.log('State:', { isDisabled, isLoading, hasImage });
```

### 2. Be Specific About What You're Logging

When debugging issues:

1. **Add targeted logger statements** with clear labels showing exactly what values to look for
2. **Tell the user the exact log line to find** (e.g., "[ComponentName] State: ...")
3. **List the specific properties needed** from any objects (e.g., "I need: isLoading, hasCurrentImage, isInputDisabled")
4. **Add temporary debug logging** that outputs the exact data structure needed to diagnose the issue

### 3. Use Appropriate Log Levels

- **`logger.debug()`** - Development-only debugging information
- **`logger.info()`** - General informational messages
- **`logger.warn()`** - Warning messages that require attention
- **`logger.error()`** - Error messages with error objects

```typescript
// ✅ DO - Appropriate log levels
logger.debug('[UserForm] Form state changed', { field, value });
logger.info('[UserService] User created successfully', { userId });
logger.warn('[PaymentService] Payment processing slow', { duration: 5000 });
logger.error('[AuthService] Login failed', error, { email });

// ❌ DON'T - Wrong log levels
logger.info('[UserForm] Debug: form state', { field, value }); // Should be debug
logger.error('[UserService] User created', { userId }); // Should be info
```

### 4. Include Component/Service Names

Always prefix log messages with the component or service name in brackets:

```typescript
// ✅ DO - Clear component identification
logger.debug('[SchedulingPage] Calendar events state', { totalEvents, jobEvents });
logger.warn('[EventTransformer] Invalid meeting date', { meetingId, scheduledDatetime });
logger.error('[PaymentService] Payment failed', error, { transactionId });

// ❌ DON'T - Unclear source
logger.debug('Calendar events state', { totalEvents });
logger.warn('Invalid date', { meetingId });
```

### 5. Provide Structured Context

Always include structured context objects with relevant data:

```typescript
// ✅ DO - Structured context
logger.warn('[SchedulingPage] Invalid posted date for job', {
  jobId: job.id,
  createdAt: job.created_at,
});

// ❌ DON'T - Unstructured or missing context
logger.warn('Invalid date for job:', job.id, job.created_at);
logger.warn('Invalid date');
```

## Never Do This

**Never ask users to:**
- "Check the console for errors"
- "Expand the Object"
- "Look at the console output"

**Always:**
- Add specific logging code
- Tell them the exact log label to find
- List the exact properties you need to see

## Examples

### Good Debugging Pattern

```typescript
logger.debug('[UserForm] Input state:', {
  isDisabled: isInputDisabled,
  isLoading: isLoading,
  hasImage: hasCurrentImage,
});
```

Then tell the user: "Look for the line that says '[UserForm] Input state:' and tell me the values of isDisabled, isLoading, and hasImage"

### Error Logging Pattern

```typescript
try {
  const result = await processPayment(data);
  return result;
} catch (error) {
  logger.error('[PaymentService] Payment processing failed', error, {
    transactionId: data.transactionId,
    amount: data.amount,
    userId: data.userId,
  });
  throw error;
}
```

### Warning Pattern

```typescript
if (isNaN(postedDate.getTime())) {
  logger.warn('[EventTransformer] Invalid posted date for job', {
    jobId: job.id,
    createdAt: job.created_at,
  });
  return; // Skip this job
}
```

## Migration from console.* Statements

All `console.*` statements should be replaced with logger calls:

- `console.log()` → `logger.info()` or `logger.debug()` (based on context)
- `console.warn()` → `logger.warn()`
- `console.error()` → `logger.error()`
- `console.info()` → `logger.info()`
- `console.debug()` → `logger.debug()`

## Legacy Code Cleanup

When implementing new features or making changes:

1. **Always delete legacy code** - Don't leave old code paths "just in case"
2. **Remove backward compatibility** - If migrating to a new pattern, remove the old pattern completely
3. **Delete unused imports** - Remove any type imports or dependencies that are no longer used
4. **Clean up comments** - Remove "backward compat", "legacy", or "deprecated" comments referring to deleted code
5. **No fallback logic** - Avoid `oldPattern ?? newPattern` - choose one and commit

**Rationale:** Legacy code creates bugs, confusion, and maintenance burden. Clean breaks are better than dual-system support.

