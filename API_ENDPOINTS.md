# Mintenance API Documentation

**Version:** 1.2.4
**Base URL:** `https://mintenance.co.uk/api` (Production)
**Base URL:** `http://localhost:3000/api` (Development)

---

## Table of Contents

- [Authentication](#authentication)
- [Jobs](#jobs)
- [Contractors](#contractors)
- [Bids](#bids)
- [Payments](#payments)
- [Notifications](#notifications)
- [GDPR](#gdpr)
- [Webhooks](#webhooks)

---

## Authentication

All authenticated endpoints require a valid JWT token sent via HTTP-only cookie `__Host-mintenance-auth`.

### POST /api/auth/register

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "homeowner" | "contractor",
  "phone": "+441234567890"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "homeowner"
  }
}
```

**Errors:**
- `400` - Invalid input (validation failed)
- `409` - Email already exists

---

### POST /api/auth/login

Authenticate user and create session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": false
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "role": "homeowner"
  }
}
```

**Sets Cookie:** `__Host-mintenance-auth` (HTTP-only, Secure, SameSite=Strict)

**Errors:**
- `401` - Invalid credentials
- `429` - Too many login attempts (rate limit: 20/minute)

---

### POST /api/auth/logout

End user session and clear authentication cookie.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/session

Get current user session information.

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "role": "homeowner"
  },
  "session": {
    "expiresAt": "2025-10-29T12:00:00Z"
  }
}
```

**Errors:**
- `401` - Not authenticated

---

### POST /api/auth/forgot-password

Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### POST /api/auth/reset-password

Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## Jobs

### GET /api/jobs

Get list of jobs (filtered by user role).

**Query Parameters:**
- `status` - Filter by status (posted, assigned, in_progress, completed, cancelled)
- `category` - Filter by job category
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "jobs": [
    {
      "id": "uuid",
      "title": "Fix leaking tap",
      "description": "Kitchen tap needs repair",
      "budget": 150.00,
      "status": "posted",
      "category": "plumbing",
      "location": {
        "address": "123 Main St",
        "city": "London",
        "postcode": "SW1A 1AA"
      },
      "homeowner": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe"
      },
      "createdAt": "2025-10-28T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

---

### GET /api/jobs/[id]

Get specific job details.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "title": "Fix leaking tap",
  "description": "Kitchen tap needs repair",
  "budget": 150.00,
  "status": "posted",
  "category": "plumbing",
  "location": {
    "address": "123 Main St",
    "city": "London",
    "postcode": "SW1A 1AA",
    "coordinates": {
      "lat": 51.5074,
      "lng": -0.1278
    }
  },
  "homeowner": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe"
  },
  "contractor": null,
  "bids": [
    {
      "id": "uuid",
      "contractorId": "uuid",
      "bidAmount": 120.00,
      "proposalText": "I can fix this...",
      "status": "pending"
    }
  ],
  "createdAt": "2025-10-28T10:00:00Z",
  "updatedAt": "2025-10-28T10:00:00Z"
}
```

**Errors:**
- `404` - Job not found
- `403` - Not authorized to view this job

---

## Contractors

### POST /api/contractor/submit-bid

Submit a bid for a job (contractor only).

**Request Body:**
```json
{
  "jobId": "uuid",
  "bidAmount": 120.00,
  "proposalText": "I have 10 years experience...",
  "estimatedDuration": 2,
  "proposedStartDate": "2025-11-01",
  "materialsCost": 50.00,
  "laborCost": 70.00
}
```

**Validation:**
- `proposalText`: min 50 chars, max 5000 chars
- `bidAmount`: must be positive, cannot exceed job budget
- `estimatedDuration`: positive integer (hours)

**Response:** `201 Created`
```json
{
  "success": true,
  "bid": {
    "id": "uuid",
    "jobId": "uuid",
    "bidAmount": 120.00,
    "status": "pending",
    "createdAt": "2025-10-28T11:00:00Z"
  }
}
```

**Errors:**
- `400` - Invalid bid data or bid exceeds budget
- `403` - Only contractors can submit bids
- `409` - Already submitted bid for this job
- `429` - Rate limit exceeded

---

## Payments

### POST /api/payments/create-intent

Create a payment intent for a job (homeowner only).

**Request Body:**
```json
{
  "amount": 150.00,
  "currency": "gbp",
  "jobId": "uuid",
  "contractorId": "uuid",
  "metadata": {
    "description": "Payment for job completion"
  }
}
```

**Validation:**
- `amount`: positive number, max £10,000
- `currency`: gbp, usd, or eur

**Response:** `200 OK`
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "escrowTransactionId": "uuid",
  "amount": 150.00,
  "currency": "gbp"
}
```

**Security:**
- Requires CSRF token validation
- Creates escrow transaction
- Validates homeowner owns job

**Errors:**
- `401` - Not authenticated
- `403` - Only homeowner can create payments
- `404` - Job not found
- `400` - Job has no assigned contractor

---

### POST /api/payments/release-escrow

Release escrowed funds to contractor (homeowner only).

**Request Body:**
```json
{
  "escrowTransactionId": "uuid",
  "jobId": "uuid"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Funds released to contractor",
  "transaction": {
    "id": "uuid",
    "status": "completed",
    "amount": 150.00
  }
}
```

**Business Logic:**
- Job must be completed
- Only homeowner can release
- Funds transferred to contractor

**Errors:**
- `400` - Job not completed or invalid status
- `403` - Not authorized
- `404` - Transaction not found
- `409` - Transaction already processed

---

### GET /api/payments/history

Get payment history for current user.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `status` - Filter by status

**Response:** `200 OK`
```json
{
  "payments": [
    {
      "id": "uuid",
      "amount": 150.00,
      "currency": "gbp",
      "status": "succeeded",
      "jobId": "uuid",
      "jobTitle": "Fix leaking tap",
      "createdAt": "2025-10-28T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 20
  }
}
```

---

## Notifications

### GET /api/notifications

Get notifications for current user.

**Query Parameters:**
- `unread` - Filter unread only (true/false)
- `page` - Page number
- `limit` - Items per page (max: 50)

**Response:** `200 OK`
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "new_bid",
      "title": "New bid received",
      "message": "John Smith submitted a bid of £120",
      "read": false,
      "data": {
        "jobId": "uuid",
        "bidId": "uuid"
      },
      "createdAt": "2025-10-28T13:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

---

### GET /api/notifications/unread-count

Get count of unread notifications.

**Response:** `200 OK`
```json
{
  "count": 5
}
```

---

### POST /api/notifications/[id]/read

Mark notification as read.

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

### POST /api/notifications/mark-all-read

Mark all notifications as read.

**Response:** `200 OK`
```json
{
  "success": true,
  "count": 5
}
```

---

## GDPR

### POST /api/gdpr/export-data

Request export of all user data (GDPR Article 15).

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Data export request received",
  "requestId": "uuid",
  "estimatedCompletionTime": "2025-10-29T14:00:00Z"
}
```

**Notes:**
- Export sent via email within 24 hours
- Includes all personal data, jobs, bids, payments

---

### POST /api/gdpr/delete-data

Request account and data deletion (GDPR Article 17).

**Request Body:**
```json
{
  "confirmPassword": "UserPassword123!",
  "reason": "no longer need service"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Deletion request submitted",
  "scheduledDeletionDate": "2025-11-07T00:00:00Z"
}
```

**Notes:**
- 7-day grace period before permanent deletion
- All personal data anonymized or deleted
- Cannot be undone after grace period

---

## Webhooks

### POST /api/webhooks/stripe

Stripe webhook endpoint for payment events.

**Headers Required:**
- `stripe-signature` - Stripe signature for verification

**Events Handled:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

**Response:** `200 OK`
```json
{
  "received": true
}
```

**Security:**
- Signature verification required
- Idempotent event processing
- Automatic retry on failure

---

## Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 20 requests | 1 minute |
| API endpoints | 100 requests | 1 minute |
| Payment operations | 10 requests | 1 minute |
| GDPR requests | 5 requests | 1 hour |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1698508800
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "email",
    "message": "Email already exists"
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_REQUIRED` - Not authenticated
- `AUTHORIZATION_FAILED` - Not authorized
- `RESOURCE_NOT_FOUND` - Resource doesn't exist
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## Security

### Authentication
- JWT tokens in HTTP-only cookies
- Secure flag enabled in production
- SameSite=Strict for CSRF protection

### CSRF Protection
- Double-submit cookie pattern
- Required for all state-changing operations

### Input Validation
- Zod schema validation on all inputs
- SQL injection prevention via parameterized queries
- XSS prevention via DOMPurify sanitization

### Rate Limiting
- Redis-backed rate limiting
- Per-IP and per-user limits
- Graceful degradation if Redis unavailable

---

## SDKs and Client Libraries

**JavaScript/TypeScript:**
```typescript
import { MintenanceClient } from '@mintenance/sdk';

const client = new MintenanceClient({
  baseUrl: 'https://mintenance.co.uk/api'
});

// With authentication
await client.jobs.list({ status: 'posted' });
```

---

## Support

**Documentation:** https://docs.mintenance.co.uk
**API Status:** https://status.mintenance.co.uk
**Support Email:** api@mintenance.co.uk

---

**Last Updated:** 2025-10-28
**Version:** 1.2.4
