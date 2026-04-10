import { z } from 'zod';
import {
  EmailSchema,
  PasswordSchema,
  NameSchema,
  PhoneSchema,
  UUIDSchema,
  DateSchema,
} from './common';

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const UserRoleSchema = z.enum(['homeowner', 'contractor'], {
  errorMap: () => ({ message: 'Role must be either homeowner or contractor' }),
});

const UserSchema = z.object({
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
  verified: z.boolean().default(false),
  phone_verified: z.boolean().default(false),
});

const UserProfileSchema = UserSchema.extend({
  address: z
    .object({
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z
        .string()
        .min(2, 'State is required')
        .max(2, 'State must be 2 characters'),
      zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
      country: z.string().default('US'),
    })
    .optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  skills: z.array(z.string()).optional(),
  rating: z.number().min(0).max(5).optional(),
  completed_jobs: z.number().int().min(0).default(0),
});

const CreateUserSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: NameSchema,
  lastName: NameSchema,
  role: UserRoleSchema,
  phone: PhoneSchema,
});

const SignInSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

const UpdateUserSchema = UserSchema.partial().omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Type exports
type User = z.infer<typeof UserSchema>;
type UserProfile = z.infer<typeof UserProfileSchema>;
type CreateUser = z.infer<typeof CreateUserSchema>;
type SignIn = z.infer<typeof SignInSchema>;
type UpdateUser = z.infer<typeof UpdateUserSchema>;
