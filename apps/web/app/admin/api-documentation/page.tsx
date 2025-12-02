'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';;
import {
  Code,
  Book,
  Key,
  Lock,
  Zap,
  Server,
  Globe,
  AlertCircle,
  Copy,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Activity,
  Shield,
  Database,
  FileText,
  Webhook,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
};

interface Endpoint {
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

const endpoints: Endpoint[] = [
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
    requestExample: `curl -X GET "https://api.mintenance.com/v1/jobs?status=posted&limit=20" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "job_123",
      "title": "Kitchen Renovation",
      "status": "posted",
      "budget": 5000,
      "location": "London, UK",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 20,
    "offset": 0
  }
}`,
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
    requestExample: `curl -X POST "https://api.mintenance.com/v1/jobs" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Bathroom Plumbing Repair",
    "description": "Fix leaking shower and replace tap",
    "budget": 800,
    "location": "Manchester, UK"
  }'`,
    responseExample: `{
  "success": true,
  "data": {
    "id": "job_456",
    "title": "Bathroom Plumbing Repair",
    "status": "posted",
    "budget": 800,
    "created_at": "2025-01-15T11:45:00Z"
  }
}`,
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
      { name: 'role', type: 'string', required: false, description: 'Filter by user role (homeowner/contractor)' },
      { name: 'verified', type: 'boolean', required: false, description: 'Filter by verification status' },
    ],
    requestExample: `curl -X GET "https://api.mintenance.com/v1/users?role=contractor&verified=true" \\
  -H "Authorization: Bearer YOUR_OAUTH_TOKEN"`,
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "user_789",
      "email": "contractor@example.com",
      "role": "contractor",
      "verified": true,
      "created_at": "2024-06-10T08:20:00Z"
    }
  ]
}`,
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
    requestExample: `curl -X GET "https://api.mintenance.com/v1/contractors?specialty=plumbing&rating_min=4.5" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "contractor_321",
      "name": "John Smith Plumbing",
      "rating": 4.8,
      "reviews_count": 127,
      "specialties": ["plumbing", "heating"],
      "location": "Birmingham, UK"
    }
  ]
}`,
  },
  {
    id: 'webhook-job-created',
    method: 'POST',
    path: '/webhooks/job.created',
    description: 'Webhook triggered when a new job is created',
    category: 'Webhooks',
    authentication: 'Webhook Secret',
    rateLimit: 'N/A',
    requestExample: `// Webhook payload sent to your endpoint
{
  "event": "job.created",
  "timestamp": "2025-01-15T12:00:00Z",
  "data": {
    "job_id": "job_999",
    "title": "Garden Landscaping",
    "budget": 3000,
    "homeowner_id": "user_111"
  }
}`,
    responseExample: `// Your endpoint should respond with:
{
  "received": true
}`,
  },
];

const categories = ['All', 'Jobs', 'Users', 'Contractors', 'Payments', 'Webhooks'];

const languages = [
  { id: 'curl', name: 'cURL', icon: Terminal },
  { id: 'javascript', name: 'JavaScript', icon: Code },
  { id: 'python', name: 'Python', icon: Code },
  { id: 'php', name: 'PHP', icon: Code },
];

export default function APIDocumentationPage2025() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('curl');
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'endpoints' | 'authentication' | 'webhooks' | 'playground'>('endpoints');

  const filteredEndpoints = endpoints.filter(
    (endpoint) => selectedCategory === 'All' || endpoint.category === selectedCategory
  );

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'POST':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'PUT':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'PATCH':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'DELETE':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-16 px-6">
        <MotionDiv
          className="max-w-7xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Code className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-5xl font-bold mb-2">API Documentation</h1>
              <p className="text-xl text-purple-100">
                Integrate Mintenance into your applications
              </p>
            </div>
          </div>

          {/* API Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-10">
            {[
              { label: 'API Version', value: 'v1.0', icon: Server },
              { label: 'Uptime', value: '99.9%', icon: Activity },
              { label: 'Endpoints', value: '50+', icon: Globe },
              { label: 'Rate Limit', value: '1000/hr', icon: Zap },
            ].map((stat, index) => (
              <MotionDiv
                key={stat.label}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <stat.icon className="w-5 h-5 text-purple-200" />
                  <span className="text-sm text-purple-200">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </MotionDiv>
            ))}
          </div>
        </MotionDiv>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white rounded-xl p-2 shadow-sm border border-gray-200">
          {(['endpoints', 'authentication', 'webhooks', 'playground'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Endpoints Tab */}
          {activeTab === 'endpoints' && (
            <MotionDiv
              key="endpoints"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              {/* Category Filter */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-700">Categories:</span>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedCategory === category
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selector */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Code Examples:</span>
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setSelectedLanguage(lang.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedLanguage === lang.id
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <lang.icon className="w-4 h-4" />
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Endpoints List */}
              <MotionDiv variants={staggerContainer} className="space-y-4">
                {filteredEndpoints.map((endpoint) => (
                  <MotionDiv
                    key={endpoint.id}
                    variants={fadeIn}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    {/* Endpoint Header */}
                    <button
                      onClick={() =>
                        setExpandedEndpoint(expandedEndpoint === endpoint.id ? null : endpoint.id)
                      }
                      className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-bold border ${getMethodColor(
                            endpoint.method
                          )}`}
                        >
                          {endpoint.method}
                        </span>
                        <div className="text-left flex-1">
                          <code className="text-sm font-mono text-gray-900">
                            {endpoint.path}
                          </code>
                          <p className="text-sm text-gray-600 mt-1">{endpoint.description}</p>
                        </div>
                      </div>
                      {expandedEndpoint === endpoint.id ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedEndpoint === endpoint.id && (
                        <MotionDiv
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-gray-200"
                        >
                          <div className="p-6 space-y-6 bg-gray-50">
                            {/* Endpoint Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Lock className="w-4 h-4 text-purple-600" />
                                  <span className="text-xs font-semibold text-gray-500 uppercase">
                                    Authentication
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-900">
                                  {endpoint.authentication}
                                </p>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Zap className="w-4 h-4 text-purple-600" />
                                  <span className="text-xs font-semibold text-gray-500 uppercase">
                                    Rate Limit
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-900">
                                  {endpoint.rateLimit}
                                </p>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Database className="w-4 h-4 text-purple-600" />
                                  <span className="text-xs font-semibold text-gray-500 uppercase">
                                    Category
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-900">
                                  {endpoint.category}
                                </p>
                              </div>
                            </div>

                            {/* Parameters */}
                            {endpoint.parameters && endpoint.parameters.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                  Parameters
                                </h4>
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                  <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                                          Name
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                                          Type
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                                          Required
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                                          Description
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {endpoint.parameters.map((param, idx) => (
                                        <tr
                                          key={param.name}
                                          className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                        >
                                          <td className="px-4 py-2 text-sm font-mono text-purple-600">
                                            {param.name}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-600">
                                            {param.type}
                                          </td>
                                          <td className="px-4 py-2 text-sm">
                                            {param.required ? (
                                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                                                Required
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                                Optional
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-600">
                                            {param.description}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Request Example */}
                            {endpoint.requestExample && (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-semibold text-gray-900">
                                    Request Example
                                  </h4>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(
                                        endpoint.requestExample!,
                                        `${endpoint.id}-request`
                                      )
                                    }
                                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                  >
                                    {copiedCode === `${endpoint.id}-request` ? (
                                      <CheckCircle className="w-4 h-4" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                    Copy
                                  </button>
                                </div>
                                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                  <code>{endpoint.requestExample}</code>
                                </pre>
                              </div>
                            )}

                            {/* Response Example */}
                            {endpoint.responseExample && (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-semibold text-gray-900">
                                    Response Example
                                  </h4>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(
                                        endpoint.responseExample!,
                                        `${endpoint.id}-response`
                                      )
                                    }
                                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                  >
                                    {copiedCode === `${endpoint.id}-response` ? (
                                      <CheckCircle className="w-4 h-4" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                    Copy
                                  </button>
                                </div>
                                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                  <code>{endpoint.responseExample}</code>
                                </pre>
                              </div>
                            )}
                          </div>
                        </MotionDiv>
                      )}
                    </AnimatePresence>
                  </MotionDiv>
                ))}
              </MotionDiv>
            </MotionDiv>
          )}

          {/* Authentication Tab */}
          {activeTab === 'authentication' && (
            <MotionDiv
              key="authentication"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Key className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Authentication</h2>
                    <p className="text-gray-600">Secure your API requests</p>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* API Key Authentication */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">API Key</h3>
                    <p className="text-gray-600 mb-4">
                      Include your API key in the Authorization header of every request:
                    </p>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>
                        {`Authorization: Bearer YOUR_API_KEY`}
                      </code>
                    </pre>
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Security Best Practices</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-800">
                          <li>Never share your API key publicly</li>
                          <li>Rotate your keys regularly</li>
                          <li>Use environment variables to store keys</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* OAuth 2.0 */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">OAuth 2.0</h3>
                    <p className="text-gray-600 mb-4">
                      For user-specific actions, use OAuth 2.0 authentication flow:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                      <li>Redirect user to authorization URL</li>
                      <li>User grants permission</li>
                      <li>Receive authorization code</li>
                      <li>Exchange code for access token</li>
                      <li>Use access token in API requests</li>
                    </ol>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm mt-4">
                      <code>
                        {`https://api.mintenance.com/oauth/authorize?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  response_type=code&
  scope=read_jobs write_jobs`}
                      </code>
                    </pre>
                  </div>

                  {/* Rate Limiting */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Limiting</h3>
                    <p className="text-gray-600 mb-4">
                      API requests are limited to prevent abuse. Rate limits vary by endpoint:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600 mb-2">1,000</div>
                        <div className="text-sm text-gray-600">Requests per hour</div>
                      </div>
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-2xl font-bold text-indigo-600 mb-2">100</div>
                        <div className="text-sm text-gray-600">Requests per minute</div>
                      </div>
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 mb-2">10,000</div>
                        <div className="text-sm text-gray-600">Requests per day</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </MotionDiv>
          )}

          {/* Webhooks Tab */}
          {activeTab === 'webhooks' && (
            <MotionDiv
              key="webhooks"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Webhook className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Webhooks</h2>
                    <p className="text-gray-600">Real-time event notifications</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-gray-700">
                    Webhooks allow you to receive real-time notifications when events occur in
                    your Mintenance account. Configure webhook endpoints in your dashboard to
                    receive POST requests for specific events.
                  </p>

                  {/* Available Events */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Available Events
                    </h3>
                    <div className="space-y-2">
                      {[
                        { event: 'job.created', description: 'Triggered when a new job is posted' },
                        { event: 'job.updated', description: 'Triggered when job details change' },
                        { event: 'bid.submitted', description: 'Triggered when a contractor submits a bid' },
                        { event: 'payment.completed', description: 'Triggered when payment is processed' },
                        { event: 'review.submitted', description: 'Triggered when a review is posted' },
                      ].map((item) => (
                        <div
                          key={item.event}
                          className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <code className="text-sm font-mono text-purple-600">{item.event}</code>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Webhook Security */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Webhook Security
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Verify webhook authenticity by checking the signature in the{' '}
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                        X-Mintenance-Signature
                      </code>{' '}
                      header:
                    </p>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>
                        {`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}`}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </MotionDiv>
          )}

          {/* API Playground Tab */}
          {activeTab === 'playground' && (
            <MotionDiv
              key="playground"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Terminal className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">API Playground</h2>
                    <p className="text-gray-600">Test API endpoints interactively</p>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl text-center">
                  <Terminal className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Interactive API Testing
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Test API endpoints directly from your browser with our interactive playground
                  </p>
                  <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all">
                    <ExternalLink className="w-5 h-5" />
                    Open Playground
                  </button>
                </div>

                {/* Quick Start Guide */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start</h3>
                  <ol className="space-y-3">
                    {[
                      'Generate your API key from the dashboard',
                      'Select an endpoint to test',
                      'Configure request parameters',
                      'Click "Send Request" to test',
                      'View formatted response',
                    ].map((step, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Additional Resources */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <MotionDiv
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <Book className="w-10 h-10 text-purple-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentation</h3>
            <p className="text-sm text-gray-600 mb-4">
              Comprehensive guides and tutorials
            </p>
            <button className="text-purple-600 font-medium text-sm flex items-center gap-2 hover:gap-3 transition-all">
              Read Docs
              <ExternalLink className="w-4 h-4" />
            </button>
          </MotionDiv>

          <MotionDiv
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <Shield className="w-10 h-10 text-indigo-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Security</h3>
            <p className="text-sm text-gray-600 mb-4">
              Learn about API security best practices
            </p>
            <button className="text-indigo-600 font-medium text-sm flex items-center gap-2 hover:gap-3 transition-all">
              View Security
              <ExternalLink className="w-4 h-4" />
            </button>
          </MotionDiv>

          <MotionDiv
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <FileText className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Support</h3>
            <p className="text-sm text-gray-600 mb-4">
              Get help with API integration
            </p>
            <button className="text-blue-600 font-medium text-sm flex items-center gap-2 hover:gap-3 transition-all">
              Contact Support
              <ExternalLink className="w-4 h-4" />
            </button>
          </MotionDiv>
        </div>
      </div>
    </div>
  );
}
