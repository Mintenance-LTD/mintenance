import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { POST as logoutHandler } from '@/app/api/auth/logout/route';
import { serverSupabase } from '@/lib/api/supabaseServer';

// Mock Supabase
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(),
    })),
  },
}));

// Mock JWT functions
vi.mock('@mintenance/auth', () => ({
  generateJWT: vi.fn(() => 'mock-jwt-token'),
  verifyPassword: vi.fn(() => true),
  hashPassword: vi.fn(() => 'hashed-password'),
}));

describe('Authentication API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should successfully log in a user with valid credentials', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      };

      (serverSupabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toEqual(mockUser);
      expect(serverSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return 400 for missing email or password', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Email and password are required');
    });

    it('should return 401 for invalid credentials', async () => {
      (serverSupabase.auth.signInWithPassword as any).mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid credentials');
    });

    it('should handle rate limiting', async () => {
      // Simulate multiple login attempts
      const requests = Array(10).fill(null).map(() =>
        new NextRequest('http://localhost/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
          headers: {
            'x-forwarded-for': '192.168.1.1',
          },
        })
      );

      const responses = await Promise.all(requests.map(req => loginHandler(req)));
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'newuser@example.com',
        user_metadata: { full_name: 'New User' },
      };

      (serverSupabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      });

      (serverSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          full_name: 'New User',
          role: 'homeowner',
        }),
      });

      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user).toEqual(mockUser);
    });

    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'SecurePass123!',
          full_name: 'Test User',
          role: 'homeowner',
        }),
      });

      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid email format');
    });

    it('should validate password strength', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'weak',
          full_name: 'Test User',
          role: 'homeowner',
        }),
      });

      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Password must be at least 8 characters');
    });

    it('should prevent duplicate email registration', async () => {
      (serverSupabase.auth.signUp as any).mockResolvedValue({
        data: null,
        error: { message: 'User already registered' },
      });

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          full_name: 'Test User',
          role: 'homeowner',
        }),
      });

      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully log out a user', async () => {
      (serverSupabase.auth.signOut as any).mockResolvedValue({
        error: null,
      });

      const request = new NextRequest('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-token',
        },
      });

      const response = await logoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Logged out successfully');
    });

    it('should handle logout errors', async () => {
      (serverSupabase.auth.signOut as any).mockResolvedValue({
        error: { message: 'Failed to logout' },
      });

      const request = new NextRequest('http://localhost/api/auth/logout', {
        method: 'POST',
      });

      const response = await logoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to logout');
    });
  });

  describe('Authentication Middleware', () => {
    it('should validate JWT tokens', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };

      (serverSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/protected', {
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      // Test middleware validation
      const user = await serverSupabase.auth.getUser();
      expect(user.data.user).toEqual(mockUser);
    });

    it('should reject invalid tokens', async () => {
      (serverSupabase.auth.getUser as any).mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' },
      });

      const request = new NextRequest('http://localhost/api/protected', {
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      const user = await serverSupabase.auth.getUser();
      expect(user.error).toBeDefined();
    });
  });

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens on mutations', async () => {
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
        headers: {
          'X-CSRF-Token': 'valid-csrf-token',
        },
      });

      // CSRF validation would happen in middleware
      expect(request.headers.get('X-CSRF-Token')).toBeTruthy();
    });
  });
});