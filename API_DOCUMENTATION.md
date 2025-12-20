# 📚 Mintenance API Documentation

## Authentication Service

### **Auth Endpoints**

#### Sign Up
```typescript
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "homeowner" | "contractor"
}
```

#### Sign In
```typescript
POST /auth/signin
Content-Type: application/json

{
  "email": "user@example.com", 
  "password": "password123"
}
```

#### Refresh Token
```typescript
POST /auth/refresh
Authorization: Bearer <refresh_token>
```

## Job Management

### **Job Endpoints**

#### Create Job
```typescript
POST /jobs
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Kitchen Faucet Repair",
  "description": "Need urgent repair...",
  "category": "plumbing",
  "budget": 150.00,
  "location": "123 Main St, City, State",
  "priority": "high" | "medium" | "low",
  "scheduledDate": "2024-01-15T10:00:00Z"
}
```

#### Get Jobs
```typescript
GET /jobs?page=1&limit=20&status=active&category=plumbing
Authorization: Bearer <access_token>
```

#### Update Job Status
```typescript
PATCH /jobs/{jobId}/status
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "in_progress" | "completed" | "cancelled"
}
```

## Payment Processing

### **Payment Endpoints**

#### Create Payment Intent
```typescript
POST /payments/intent
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 15000, // amount in cents
  "currency": "usd",
  "jobId": "job_123",
  "metadata": {
    "jobTitle": "Kitchen Repair"
  }
}
```

#### Confirm Payment
```typescript
POST /payments/confirm
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "paymentIntentId": "pi_123",
  "paymentMethodId": "pm_123"
}
```

## User Management

### **Profile Endpoints**

#### Get Profile
```typescript
GET /users/profile
Authorization: Bearer <access_token>
```

#### Update Profile
```typescript
PATCH /users/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "ST",
    "zipCode": "12345"
  }
}
```

## Real-time Features

### **WebSocket Events**

#### Job Updates
```typescript
// Connect to WebSocket
const socket = new WebSocket('wss://api.mintenance.com/ws');

// Listen for job updates
socket.on('job:update', (data) => {
  console.log('Job updated:', data.jobId, data.status);
});

// Listen for new messages
socket.on('message:new', (data) => {
  console.log('New message:', data.content);
});
```

## Error Handling

### **Error Response Format**
```typescript
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": {
      "field": "password",
      "reason": "incorrect"
    }
  }
}
```

### **Common Error Codes**
- `INVALID_CREDENTIALS` - Authentication failed
- `INSUFFICIENT_FUNDS` - Payment failed due to insufficient funds
- `JOB_NOT_FOUND` - Requested job does not exist
- `UNAUTHORIZED` - User not authorized for this action
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `VALIDATION_ERROR` - Request data validation failed

## Rate Limiting

- **Authentication**: 5 requests per minute
- **Job Operations**: 100 requests per hour
- **Payment Processing**: 10 requests per minute
- **File Uploads**: 20 requests per hour

## API Response Formats

### **Success Response**
```typescript
{
  "success": true,
  "data": {
    // Response data
  },
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### **Paginated Response**
```typescript
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## SDK Usage Examples

### **TypeScript SDK**
```typescript
import { MintenanceAPI } from '@mintenance/sdk';

const api = new MintenanceAPI({
  baseURL: 'https://api.mintenance.com',
  apiKey: process.env.MINTENANCE_API_KEY
});

// Create a job
const job = await api.jobs.create({
  title: 'Kitchen Repair',
  description: 'Fix leaky faucet',
  budget: 150.00
});

// Process payment
const payment = await api.payments.createIntent({
  amount: 15000,
  jobId: job.id
});
```
