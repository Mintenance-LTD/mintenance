import { Terminal, Code } from 'lucide-react';

export interface Endpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  category: string;
  authentication: 'API Key' | 'OAuth 2.0' | 'JWT' | 'Webhook Secret' | 'None';
  rateLimit: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  requestExample?: string;
  responseExample?: string;
}

export const endpoints: Endpoint[] = [
  {
    id: 'get-jobs',
    method: 'GET',
    path: '/api/v1/jobs',
    description: 'Retrieve a list of all jobs',
    category: 'Jobs',
    authentication: 'API Key',
    rateLimit: '100 requests/minute',
    parameters: [
      { name: 'status', type: 'string', required: false, description: 'Filter by job status' },
      { name: 'limit', type: 'number', required: false, description: 'Number of results (max 100)' },
      { name: 'offset', type: 'number', required: false, description: 'Pagination offset' },
    ],
    requestExample: `curl -X GET "https://api.mintenance.com/v1/jobs?status=posted&limit=20" \\\n  -H "Authorization: Bearer YOUR_API_KEY"`,
    responseExample: `{\n  "success": true,\n  "data": [{ "id": "job_123", "title": "Kitchen Renovation", "status": "posted", "budget": 5000 }],\n  "pagination": { "total": 156, "limit": 20, "offset": 0 }\n}`,
  },
  {
    id: 'create-job',
    method: 'POST',
    path: '/api/v1/jobs',
    description: 'Create a new job posting',
    category: 'Jobs',
    authentication: 'API Key',
    rateLimit: '50 requests/minute',
    parameters: [
      { name: 'title', type: 'string', required: true, description: 'Job title' },
      { name: 'description', type: 'string', required: true, description: 'Job description' },
      { name: 'budget', type: 'number', required: true, description: 'Budget in GBP' },
      { name: 'location', type: 'string', required: true, description: 'Job location' },
    ],
    requestExample: `curl -X POST "https://api.mintenance.com/v1/jobs" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "title": "Bathroom Plumbing Repair" }'`,
    responseExample: `{\n  "success": true,\n  "data": { "id": "job_456", "title": "Bathroom Plumbing Repair", "status": "posted" }\n}`,
  },
  {
    id: 'get-users',
    method: 'GET',
    path: '/api/v1/users',
    description: 'Retrieve user information',
    category: 'Users',
    authentication: 'OAuth 2.0',
    rateLimit: '200 requests/minute',
    parameters: [
      { name: 'role', type: 'string', required: false, description: 'Filter by user role' },
      { name: 'verified', type: 'boolean', required: false, description: 'Filter by verification status' },
    ],
    requestExample: `curl -X GET "https://api.mintenance.com/v1/users?role=contractor" \\\n  -H "Authorization: Bearer YOUR_OAUTH_TOKEN"`,
    responseExample: `{\n  "success": true,\n  "data": [{ "id": "user_789", "role": "contractor", "verified": true }]\n}`,
  },
  {
    id: 'get-contractors',
    method: 'GET',
    path: '/api/v1/contractors',
    description: 'Search for contractors by criteria',
    category: 'Contractors',
    authentication: 'API Key',
    rateLimit: '100 requests/minute',
    parameters: [
      { name: 'specialty', type: 'string', required: false, description: 'Filter by specialty' },
      { name: 'location', type: 'string', required: false, description: 'Filter by location' },
      { name: 'rating_min', type: 'number', required: false, description: 'Minimum rating (0-5)' },
    ],
    requestExample: `curl -X GET "https://api.mintenance.com/v1/contractors?specialty=plumbing" \\\n  -H "Authorization: Bearer YOUR_API_KEY"`,
    responseExample: `{\n  "success": true,\n  "data": [{ "id": "contractor_321", "name": "John Smith Plumbing", "rating": 4.8 }]\n}`,
  },
  {
    id: 'webhook-job-created',
    method: 'POST',
    path: '/webhooks/job.created',
    description: 'Webhook triggered when a new job is created',
    category: 'Webhooks',
    authentication: 'Webhook Secret',
    rateLimit: 'N/A',
    requestExample: `// Webhook payload\n{\n  "event": "job.created",\n  "data": { "job_id": "job_999", "title": "Garden Landscaping" }\n}`,
    responseExample: `{ "received": true }`,
  },
];

export const categories = ['All', 'Jobs', 'Users', 'Contractors', 'Payments', 'Webhooks'];

export const languages = [
  { id: 'curl', name: 'cURL', icon: Terminal },
  { id: 'javascript', name: 'JavaScript', icon: Code },
  { id: 'python', name: 'Python', icon: Code },
  { id: 'php', name: 'PHP', icon: Code },
];

export const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
};

export function getMethodColor(method: string): string {
  switch (method) {
    case 'GET': return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'POST': return 'bg-green-100 text-green-700 border-green-300';
    case 'PUT': return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'PATCH': return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'DELETE': return 'bg-red-100 text-red-700 border-red-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}
