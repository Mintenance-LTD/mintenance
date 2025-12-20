import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

export const EmailSchema = z.string().email('Invalid email format').min(1, 'Email is required');

export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number');

export const NameSchema = z.string()
  .min(1, 'Name is required')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

export const PhoneSchema = z.string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
  .optional();

export const MoneySchema = z.number()
  .positive('Amount must be positive')
  .finite('Amount must be a valid number')
  .refine((val) => val <= 1000000, 'Amount cannot exceed $1,000,000');

export const DateSchema = z.string().datetime('Invalid date format');

export const UUIDSchema = z.string().uuid('Invalid UUID format');

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const UserRoleSchema = z.enum(['homeowner', 'contractor'], {
  errorMap: () => ({ message: 'Role must be either homeowner or contractor' }),
});

export const UserSchema = z.object({
  id: UUIDSchema,
  email: EmailSchema,
  first_name: NameSchema,
  last_name: NameSchema,
  role: UserRoleSchema,
  phone: PhoneSchema,
  avatar_url: z.string().url().optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
  is_active: z.boolean().default(true),
  email_verified: z.boolean().default(false),
  phone_verified: z.boolean().default(false),
});

export const UserProfileSchema = UserSchema.extend({
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required').max(2, 'State must be 2 characters'),
    zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
    country: z.string().default('US'),
  }).optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  skills: z.array(z.string()).optional(),
  rating: z.number().min(0).max(5).optional(),
  completed_jobs: z.number().int().min(0).default(0),
});

export const CreateUserSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: NameSchema,
  lastName: NameSchema,
  role: UserRoleSchema,
  phone: PhoneSchema,
});

export const SignInSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const UpdateUserSchema = UserSchema.partial().omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================================
// JOB SCHEMAS
// ============================================================================

export const JobCategorySchema = z.enum([
  'plumbing',
  'electrical',
  'hvac',
  'carpentry',
  'painting',
  'landscaping',
  'cleaning',
  'appliance_repair',
  'roofing',
  'flooring',
  'other',
], {
  errorMap: () => ({ message: 'Invalid job category' }),
});

export const JobPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  errorMap: () => ({ message: 'Priority must be low, medium, high, or urgent' }),
});

export const JobStatusSchema = z.enum([
  'draft',
  'posted',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
], {
  errorMap: () => ({ message: 'Invalid job status' }),
});

export const JobSchema = z.object({
  id: UUIDSchema,
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  category: JobCategorySchema,
  priority: JobPrioritySchema,
  status: JobStatusSchema.default('draft'),
  budget: MoneySchema,
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required').max(2, 'State must be 2 characters'),
    zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),
  photos: z.array(z.string().url('Invalid photo URL')).max(10, 'Maximum 10 photos allowed'),
  requirements: z.array(z.string()).optional(),
  preferred_start_date: DateSchema.optional(),
  estimated_duration: z.string().optional(),
  homeowner_id: UUIDSchema,
  contractor_id: UUIDSchema.optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
  completed_at: DateSchema.optional(),
});

export const CreateJobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  category: JobCategorySchema,
  priority: JobPrioritySchema,
  budget: MoneySchema,
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required').max(2, 'State must be 2 characters'),
    zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
  }),
  photos: z.array(z.string().url('Invalid photo URL')).max(10, 'Maximum 10 photos allowed').default([]),
  requirements: z.array(z.string()).optional(),
  preferred_start_date: DateSchema.optional(),
  estimated_duration: z.string().optional(),
  homeownerId: UUIDSchema,
});

export const UpdateJobSchema = JobSchema.partial().omit({
  id: true,
  homeowner_id: true,
  created_at: true,
  updated_at: true,
});

export const JobFilterSchema = z.object({
  category: JobCategorySchema.optional(),
  priority: JobPrioritySchema.optional(),
  status: JobStatusSchema.optional(),
  budget_min: MoneySchema.optional(),
  budget_max: MoneySchema.optional(),
  location_radius: z.number().min(1).max(100).optional(),
  date_from: DateSchema.optional(),
  date_to: DateSchema.optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10),
});

// ============================================================================
// BID SCHEMAS
// ============================================================================

export const BidStatusSchema = z.enum([
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
  'expired',
], {
  errorMap: () => ({ message: 'Invalid bid status' }),
});

export const BidSchema = z.object({
  id: UUIDSchema,
  job_id: UUIDSchema,
  contractor_id: UUIDSchema,
  amount: MoneySchema,
  estimated_duration: z.string().min(1, 'Estimated duration is required'),
  proposal: z.string()
    .min(20, 'Proposal must be at least 20 characters')
    .max(1000, 'Proposal must be less than 1000 characters'),
  status: BidStatusSchema.default('pending'),
  materials_cost: MoneySchema.optional(),
  labor_cost: MoneySchema.optional(),
  timeline: z.object({
    start_date: DateSchema,
    end_date: DateSchema,
    milestones: z.array(z.object({
      description: z.string().min(1, 'Milestone description required'),
      date: DateSchema,
      amount: MoneySchema.optional(),
    })).optional(),
  }).optional(),
  attachments: z.array(z.string().url('Invalid attachment URL')).max(5, 'Maximum 5 attachments').optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
  expires_at: DateSchema.optional(),
});

export const CreateBidSchema = z.object({
  job_id: UUIDSchema,
  amount: MoneySchema,
  estimated_duration: z.string().min(1, 'Estimated duration is required'),
  proposal: z.string()
    .min(20, 'Proposal must be at least 20 characters')
    .max(1000, 'Proposal must be less than 1000 characters'),
  materials_cost: MoneySchema.optional(),
  labor_cost: MoneySchema.optional(),
  timeline: z.object({
    start_date: DateSchema,
    end_date: DateSchema,
    milestones: z.array(z.object({
      description: z.string().min(1, 'Milestone description required'),
      date: DateSchema,
      amount: MoneySchema.optional(),
    })).optional(),
  }).optional(),
  attachments: z.array(z.string().url('Invalid attachment URL')).max(5, 'Maximum 5 attachments').optional(),
});

// ============================================================================
// MESSAGE SCHEMAS
// ============================================================================

export const MessageTypeSchema = z.enum(['text', 'image', 'file', 'system'], {
  errorMap: () => ({ message: 'Invalid message type' }),
});

export const MessageSchema = z.object({
  id: UUIDSchema,
  conversation_id: UUIDSchema,
  sender_id: UUIDSchema,
  recipient_id: UUIDSchema,
  type: MessageTypeSchema.default('text'),
  content: z.string().min(1, 'Message content is required').max(2000, 'Message too long'),
  attachments: z.array(z.object({
    url: z.string().url('Invalid attachment URL'),
    type: z.string(),
    name: z.string(),
    size: z.number().positive(),
  })).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  read_at: DateSchema.optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const CreateMessageSchema = z.object({
  conversation_id: UUIDSchema,
  recipient_id: UUIDSchema,
  type: MessageTypeSchema.default('text'),
  content: z.string().min(1, 'Message content is required').max(2000, 'Message too long'),
  attachments: z.array(z.object({
    url: z.string().url('Invalid attachment URL'),
    type: z.string(),
    name: z.string(),
    size: z.number().positive(),
  })).optional(),
});

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

export const PaymentStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'refunded',
], {
  errorMap: () => ({ message: 'Invalid payment status' }),
});

export const PaymentMethodSchema = z.enum(['card', 'bank_transfer', 'escrow'], {
  errorMap: () => ({ message: 'Invalid payment method' }),
});

export const PaymentSchema = z.object({
  id: UUIDSchema,
  job_id: UUIDSchema,
  payer_id: UUIDSchema,
  recipient_id: UUIDSchema,
  amount: MoneySchema,
  fee: MoneySchema.default(0),
  net_amount: MoneySchema,
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  method: PaymentMethodSchema,
  status: PaymentStatusSchema.default('pending'),
  stripe_payment_intent_id: z.string().optional(),
  description: z.string().max(500, 'Description too long').optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
  completed_at: DateSchema.optional(),
});

export const CreatePaymentSchema = z.object({
  job_id: UUIDSchema,
  recipient_id: UUIDSchema,
  amount: MoneySchema,
  method: PaymentMethodSchema,
  description: z.string().max(500, 'Description too long').optional(),
});

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

export const ApiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
  timestamp: DateSchema.optional(),
});

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    field: z.string().optional(),
  }),
  timestamp: DateSchema.optional(),
});

export const PaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    total_pages: z.number().int().min(0),
    has_next: z.boolean(),
    has_prev: z.boolean(),
  }),
});

// ============================================================================
// TYPE EXPORTS (Inferred from schemas)
// ============================================================================

export type User = z.infer<typeof UserSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type SignIn = z.infer<typeof SignInSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

export type Job = z.infer<typeof JobSchema>;
export type CreateJob = z.infer<typeof CreateJobSchema>;
export type UpdateJob = z.infer<typeof UpdateJobSchema>;
export type JobFilter = z.infer<typeof JobFilterSchema>;
export type JobCategory = z.infer<typeof JobCategorySchema>;
export type JobPriority = z.infer<typeof JobPrioritySchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;

export type Bid = z.infer<typeof BidSchema>;
export type CreateBid = z.infer<typeof CreateBidSchema>;
export type BidStatus = z.infer<typeof BidStatusSchema>;

export type Message = z.infer<typeof MessageSchema>;
export type CreateMessage = z.infer<typeof CreateMessageSchema>;
export type MessageType = z.infer<typeof MessageTypeSchema>;

export type Payment = z.infer<typeof PaymentSchema>;
export type CreatePayment = z.infer<typeof CreatePaymentSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export type ApiSuccess<T = any> = z.infer<typeof ApiSuccessSchema> & { data: T };
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type PaginatedResponse<T = any> = z.infer<typeof PaginatedResponseSchema> & { data: T[] };

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validateSchema = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(
        firstError.message,
        firstError.path.join('.'),
        firstError.code
      );
    }
    throw error;
  }
};

export const safeValidateSchema = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ValidationError } => {
  try {
    const validData = validateSchema(schema, data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error };
    }
    return {
      success: false,
      error: new ValidationError('Unknown validation error'),
    };
  }
};

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

export const isValidEmail = (email: string): boolean => {
  return EmailSchema.safeParse(email).success;
};

export const isValidPassword = (password: string): boolean => {
  return PasswordSchema.safeParse(password).success;
};

export const isValidUUID = (id: string): boolean => {
  return UUIDSchema.safeParse(id).success;
};

export const isValidJobCategory = (category: string): category is JobCategory => {
  return JobCategorySchema.safeParse(category).success;
};

export const isValidUserRole = (role: string): role is z.infer<typeof UserRoleSchema> => {
  return UserRoleSchema.safeParse(role).success;
};
