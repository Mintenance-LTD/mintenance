import { NextRequest } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';

/**
 * Test helper to create a mock NextRequest
 */
export function createMockRequest(
  method: string = 'GET',
  body?: unknown,
  headers: Record<string, string> = {},
  searchParams: Record<string, string> = {}
): NextRequest {
  const url = new URL('http://localhost:3000/api/test');
  
  // Add search params
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
}

/**
 * Mock user data for testing
 */
export const mockUsers = {
  homeowner: {
    id: 'test-homeowner-id',
    email: 'homeowner@test.com',
    role: 'homeowner' as const,
    first_name: 'Test',
    last_name: 'Homeowner',
  },
  contractor: {
    id: 'test-contractor-id',
    email: 'contractor@test.com',
    role: 'contractor' as const,
    first_name: 'Test',
    last_name: 'Contractor',
  },
  admin: {
    id: 'test-admin-id',
    email: 'admin@test.com',
    role: 'admin' as const,
    first_name: 'Test',
    last_name: 'Admin',
  },
};

/**
 * Mock getCurrentUserFromCookies for testing
 */
export async function mockGetCurrentUser(role: 'homeowner' | 'contractor' | 'admin' | null = null) {
  if (!role) {
    return null;
  }
  return mockUsers[role];
}

/**
 * Create a request with CSRF token
 */
export function createRequestWithCSRF(
  method: string = 'GET',
  body?: unknown,
  csrfToken: string = 'test-csrf-token'
): NextRequest {
  return createMockRequest(method, body, {
    'x-csrf-token': csrfToken,
  });
}

/**
 * Assert API response structure
 */
export function assertApiResponse(response: Response, expectedStatus: number) {
  expect(response.status).toBe(expectedStatus);
  return response.json();
}

/**
 * Assert error response
 */
export async function assertErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedError?: string
) {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json();
  expect(data).toHaveProperty('error');
  if (expectedError) {
    expect(data.error).toContain(expectedError);
  }
  return data;
}

/**
 * Assert success response
 */
export async function assertSuccessResponse(response: Response, expectedStatus: number = 200) {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json();
  expect(data).not.toHaveProperty('error');
  return data;
}

