import { z } from 'zod';
import {
  ApiSuccessSchema,
  ApiErrorSchema,
  PaginatedResponseSchema,
  UserSchema,
  CreateUserSchema,
  SignInSchema,
  JobSchema,
  CreateJobSchema,
  JobFilterSchema,
  BidSchema,
  CreateBidSchema,
  MessageSchema,
  CreateMessageSchema,
  PaymentSchema,
  CreatePaymentSchema,
  validateSchema,
  ValidationError,
} from '../types/schemas';
import type {
  User,
  CreateUser,
  SignIn,
  Job,
  CreateJob,
  JobFilter,
  Bid,
  CreateBid,
  Message,
  CreateMessage,
  Payment,
  CreatePayment,
  ApiSuccess,
  ApiError,
  PaginatedResponse,
} from '../types/schemas';

// ============================================================================
// API CLIENT CONFIGURATION
// ============================================================================

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
  retryCount?: number;
  retryDelay?: number;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  validateResponse?: boolean;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ============================================================================
// TYPE-SAFE API CLIENT
// ============================================================================

export class TypeSafeApiClient {
  private config: Required<ApiClientConfig>;
  private authToken: string | null = null;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000,
      defaultHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      retryCount: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  getAuthHeaders(): Record<string, string> {
    return this.authToken
      ? { Authorization: `Bearer ${this.authToken}` }
      : {};
  }

  // ============================================================================
  // CORE REQUEST METHOD
  // ============================================================================

  private async request<TResponse>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: any;
      schema?: z.ZodSchema<TResponse>;
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<TResponse> {
    const {
      method = 'GET',
      body,
      schema,
      headers = {},
      timeout = this.config.timeout,
      retries = this.config.retryCount,
    } = options;

    const url = `${this.config.baseUrl}${endpoint}`;
    const requestHeaders = {
      ...this.config.defaultHeaders,
      ...this.getAuthHeaders(),
      ...headers,
    };

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          throw new ApiError(
            errorData.error?.message || `HTTP ${response.status}`,
            response.status,
            errorData.error?.code,
            errorData.error?.details
          );
        }

        const data = await response.json();

        // Validate response if schema provided
        if (schema) {
          return validateSchema(schema, data);
        }

        return data;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof ApiError || error instanceof ValidationError) {
          throw error; // Don't retry client errors or validation errors
        }

        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new TimeoutError(`Request timeout after ${timeout}ms`);
        }

        if (attempt === retries) {
          throw new NetworkError(
            `Network request failed after ${retries + 1} attempts`,
            error as Error
          );
        }

        // Wait before retry
        await this.delay(this.config.retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError!;
  }

  private async parseErrorResponse(response: Response): Promise<ApiError> {
    try {
      const data = await response.json();
      return validateSchema(ApiErrorSchema, data);
    } catch {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
        },
      } as ApiError;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // AUTHENTICATION API
  // ============================================================================

  async signIn(credentials: SignIn): Promise<ApiSuccess<{ user: User; token: string }>> {
    validateSchema(SignInSchema, credentials);
    
    return this.request('/auth/signin', {
      method: 'POST',
      body: credentials,
      schema: ApiSuccessSchema.extend({
        data: z.object({
          user: UserSchema,
          token: z.string(),
        }),
      }),
    });
  }

  async signUp(userData: CreateUser): Promise<ApiSuccess<{ user: User; token: string }>> {
    validateSchema(CreateUserSchema, userData);
    
    return this.request('/auth/signup', {
      method: 'POST',
      body: userData,
      schema: ApiSuccessSchema.extend({
        data: z.object({
          user: UserSchema,
          token: z.string(),
        }),
      }),
    });
  }

  async signOut(): Promise<ApiSuccess<{}>> {
    return this.request('/auth/signout', {
      method: 'POST',
      schema: ApiSuccessSchema.extend({
        data: z.object({}),
      }),
    });
  }

  async refreshToken(): Promise<ApiSuccess<{ token: string }>> {
    return this.request('/auth/refresh', {
      method: 'POST',
      schema: ApiSuccessSchema.extend({
        data: z.object({
          token: z.string(),
        }),
      }),
    });
  }

  async getCurrentUser(): Promise<ApiSuccess<User>> {
    return this.request('/auth/me', {
      method: 'GET',
      schema: ApiSuccessSchema.extend({
        data: UserSchema,
      }),
    });
  }

  // ============================================================================
  // USER API
  // ============================================================================

  async getUser(userId: string): Promise<ApiSuccess<User>> {
    return this.request(`/users/${userId}`, {
      method: 'GET',
      schema: ApiSuccessSchema.extend({
        data: UserSchema,
      }),
    });
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<ApiSuccess<User>> {
    return this.request(`/users/${userId}`, {
      method: 'PATCH',
      body: updates,
      schema: ApiSuccessSchema.extend({
        data: UserSchema,
      }),
    });
  }

  // ============================================================================
  // JOB API
  // ============================================================================

  async getJobs(filters?: JobFilter): Promise<PaginatedResponse<Job>> {
    const query = filters ? new URLSearchParams(filters as any).toString() : '';
    const endpoint = `/jobs${query ? `?${query}` : ''}`;
    
    return this.request(endpoint, {
      method: 'GET',
      schema: PaginatedResponseSchema.extend({
        data: z.array(JobSchema),
      }),
    });
  }

  async getJob(jobId: string): Promise<ApiSuccess<Job>> {
    return this.request(`/jobs/${jobId}`, {
      method: 'GET',
      schema: ApiSuccessSchema.extend({
        data: JobSchema,
      }),
    });
  }

  async createJob(jobData: CreateJob): Promise<ApiSuccess<Job>> {
    validateSchema(CreateJobSchema, jobData);
    
    return this.request('/jobs', {
      method: 'POST',
      body: jobData,
      schema: ApiSuccessSchema.extend({
        data: JobSchema,
      }),
    });
  }

  async updateJob(jobId: string, updates: Partial<Job>): Promise<ApiSuccess<Job>> {
    return this.request(`/jobs/${jobId}`, {
      method: 'PATCH',
      body: updates,
      schema: ApiSuccessSchema.extend({
        data: JobSchema,
      }),
    });
  }

  async deleteJob(jobId: string): Promise<ApiSuccess<{}>> {
    return this.request(`/jobs/${jobId}`, {
      method: 'DELETE',
      schema: ApiSuccessSchema.extend({
        data: z.object({}),
      }),
    });
  }

  // ============================================================================
  // BID API
  // ============================================================================

  async getBidsForJob(jobId: string): Promise<PaginatedResponse<Bid>> {
    return this.request(`/jobs/${jobId}/bids`, {
      method: 'GET',
      schema: PaginatedResponseSchema.extend({
        data: z.array(BidSchema),
      }),
    });
  }

  async getBid(bidId: string): Promise<ApiSuccess<Bid>> {
    return this.request(`/bids/${bidId}`, {
      method: 'GET',
      schema: ApiSuccessSchema.extend({
        data: BidSchema,
      }),
    });
  }

  async createBid(bidData: CreateBid): Promise<ApiSuccess<Bid>> {
    validateSchema(CreateBidSchema, bidData);
    
    return this.request('/bids', {
      method: 'POST',
      body: bidData,
      schema: ApiSuccessSchema.extend({
        data: BidSchema,
      }),
    });
  }

  async updateBid(bidId: string, updates: Partial<Bid>): Promise<ApiSuccess<Bid>> {
    return this.request(`/bids/${bidId}`, {
      method: 'PATCH',
      body: updates,
      schema: ApiSuccessSchema.extend({
        data: BidSchema,
      }),
    });
  }

  async acceptBid(bidId: string): Promise<ApiSuccess<Bid>> {
    return this.request(`/bids/${bidId}/accept`, {
      method: 'POST',
      schema: ApiSuccessSchema.extend({
        data: BidSchema,
      }),
    });
  }

  async rejectBid(bidId: string): Promise<ApiSuccess<Bid>> {
    return this.request(`/bids/${bidId}/reject`, {
      method: 'POST',
      schema: ApiSuccessSchema.extend({
        data: BidSchema,
      }),
    });
  }

  // ============================================================================
  // MESSAGE API
  // ============================================================================

  async getConversations(): Promise<PaginatedResponse<any>> {
    return this.request('/conversations', {
      method: 'GET',
      schema: PaginatedResponseSchema,
    });
  }

  async getMessages(conversationId: string): Promise<PaginatedResponse<Message>> {
    return this.request(`/conversations/${conversationId}/messages`, {
      method: 'GET',
      schema: PaginatedResponseSchema.extend({
        data: z.array(MessageSchema),
      }),
    });
  }

  async sendMessage(messageData: CreateMessage): Promise<ApiSuccess<Message>> {
    validateSchema(CreateMessageSchema, messageData);
    
    return this.request('/messages', {
      method: 'POST',
      body: messageData,
      schema: ApiSuccessSchema.extend({
        data: MessageSchema,
      }),
    });
  }

  async markMessageAsRead(messageId: string): Promise<ApiSuccess<Message>> {
    return this.request(`/messages/${messageId}/read`, {
      method: 'POST',
      schema: ApiSuccessSchema.extend({
        data: MessageSchema,
      }),
    });
  }

  // ============================================================================
  // PAYMENT API
  // ============================================================================

  async getPayments(): Promise<PaginatedResponse<Payment>> {
    return this.request('/payments', {
      method: 'GET',
      schema: PaginatedResponseSchema.extend({
        data: z.array(PaymentSchema),
      }),
    });
  }

  async createPayment(paymentData: CreatePayment): Promise<ApiSuccess<Payment>> {
    validateSchema(CreatePaymentSchema, paymentData);
    
    return this.request('/payments', {
      method: 'POST',
      body: paymentData,
      schema: ApiSuccessSchema.extend({
        data: PaymentSchema,
      }),
    });
  }

  async getPayment(paymentId: string): Promise<ApiSuccess<Payment>> {
    return this.request(`/payments/${paymentId}`, {
      method: 'GET',
      schema: ApiSuccessSchema.extend({
        data: PaymentSchema,
      }),
    });
  }

  // ============================================================================
  // FILE UPLOAD API
  // ============================================================================

  async uploadFile(
    file: File | Blob,
    options: {
      onProgress?: (progress: number) => void;
      maxSize?: number;
      allowedTypes?: string[];
    } = {}
  ): Promise<ApiSuccess<{ url: string; filename: string }>> {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [] } = options; // 10MB default

    // Validate file size
    if (file.size > maxSize) {
      throw new ValidationError(`File size exceeds ${maxSize} bytes`);
    }

    // Validate file type
    if (allowedTypes.length > 0 && file instanceof File) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedTypes.includes(fileExtension)) {
        throw new ValidationError(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      }
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.request('/upload', {
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type to let browser set multipart/form-data boundary
        'Content-Type': '',
      },
      schema: ApiSuccessSchema.extend({
        data: z.object({
          url: z.string().url(),
          filename: z.string(),
        }),
      }),
    });
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  async healthCheck(): Promise<ApiSuccess<{ status: string; timestamp: string }>> {
    return this.request('/health', {
      method: 'GET',
      schema: ApiSuccessSchema.extend({
        data: z.object({
          status: z.string(),
          timestamp: z.string(),
        }),
      }),
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let apiClientInstance: TypeSafeApiClient | null = null;

export const createApiClient = (config: ApiClientConfig): TypeSafeApiClient => {
  apiClientInstance = new TypeSafeApiClient(config);
  return apiClientInstance;
};

export const getApiClient = (): TypeSafeApiClient => {
  if (!apiClientInstance) {
    throw new Error('API client not initialized. Call createApiClient() first.');
  }
  return apiClientInstance;
};

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

export const createDevelopmentApiClient = (): TypeSafeApiClient => {
  return createApiClient({
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
    timeout: 10000,
    retryCount: 2,
  });
};

export const createProductionApiClient = (): TypeSafeApiClient => {
  return createApiClient({
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.mintenance.com',
    timeout: 30000,
    retryCount: 3,
  });
};

export default TypeSafeApiClient;
