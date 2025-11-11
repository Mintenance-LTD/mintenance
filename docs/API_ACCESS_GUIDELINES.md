/**
 * API Access Guidelines
 * 
 * This document defines when to use Supabase direct calls vs web API endpoints.
 */

## When to Use Supabase Direct Calls

Use Supabase client directly for:
- **CRUD operations** on database tables (SELECT, INSERT, UPDATE, DELETE)
- **Real-time subscriptions** for live data updates
- **Authentication** operations (sign in, sign up, sign out, session management)
- **File uploads** to Supabase Storage
- **Simple queries** that don't require complex business logic
- **Client-side data fetching** in React components

### Examples

```typescript
// ✅ Good: Direct Supabase call for simple query
const { data, error } = await supabase
  .from('jobs')
  .select('*')
  .eq('status', 'posted');

// ✅ Good: Real-time subscription
const subscription = supabase
  .channel('jobs')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' }, (payload) => {
    console.log('New job:', payload.new);
  })
  .subscribe();

// ✅ Good: File upload
const { data, error } = await supabase.storage
  .from('photos')
  .upload('path/to/file.jpg', file);
```

## When to Use Web API Endpoints

Use web API endpoints (`/api/*`) for:
- **Complex business logic** that requires multiple database operations
- **Third-party integrations** (Stripe, Google Maps, AI services)
- **Server-side validations** that shouldn't be exposed to client
- **Admin operations** that require elevated permissions
- **Data transformations** that are expensive or require server resources
- **Operations that need to be rate-limited** or have security restrictions
- **Operations that require environment variables** not safe for client

### Examples

```typescript
// ✅ Good: Complex business logic via API
const response = await fetch('/api/jobs/create', {
  method: 'POST',
  body: JSON.stringify({ title, description, ... }),
});
// This endpoint might:
// - Validate data
// - Create job record
// - Send notifications
// - Update analytics
// - Create payment intent

// ✅ Good: Third-party integration
const response = await fetch('/api/payments/create-intent', {
  method: 'POST',
  body: JSON.stringify({ amount, jobId }),
});
// This endpoint handles Stripe integration server-side

// ✅ Good: Admin operations
const response = await fetch('/api/admin/users', {
  method: 'GET',
  headers: { Authorization: `Bearer ${token}` },
});
```

## Decision Tree

```
Is it a simple CRUD operation?
├─ Yes → Use Supabase direct call
└─ No → Does it require complex business logic?
    ├─ Yes → Use web API endpoint
    └─ No → Does it involve third-party services?
        ├─ Yes → Use web API endpoint
        └─ No → Does it require server-side secrets?
            ├─ Yes → Use web API endpoint
            └─ No → Use Supabase direct call
```

## Best Practices

1. **Start with Supabase direct calls** - They're simpler and faster
2. **Move to API endpoints** when complexity increases
3. **Keep API endpoints focused** - One endpoint, one responsibility
4. **Use TypeScript types** - Share types from `@mintenance/types`
5. **Handle errors consistently** - Use unified error handler
6. **Document API endpoints** - Include request/response types

## Migration Strategy

When migrating existing code:
1. Identify the operation type (CRUD vs complex logic)
2. Choose appropriate method (Supabase vs API)
3. Use unified API client for consistency
4. Update error handling to use unified handler
5. Test thoroughly

