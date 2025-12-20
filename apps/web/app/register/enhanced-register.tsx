'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '../components/Logo';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// Disable static optimization for this page
export const dynamic = 'force-dynamic';

/**
 * Registration form schema with Zod validation
 */
const registerFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number'),
  role: z.enum(['homeowner', 'contractor'], {
    required_error: 'Please select a role',
  }),
});

type RegisterFormData = z.infer<typeof registerFormSchema>;

/**
 * Enhanced Register Form Component
 * Uses React Hook Form + Zod for validation
 */
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const { csrfToken, loading: csrfLoading } = useCSRF();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: (roleParam === 'contractor' || roleParam === 'homeowner' ? roleParam : 'homeowner') as 'homeowner' | 'contractor',
    },
  });

  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');

  const selectedRole = watch('role');

  React.useEffect(() => {
    if (roleParam === 'contractor' || roleParam === 'homeowner') {
      setValue('role', roleParam);
    }
  }, [roleParam, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    if (!csrfToken) {
      setErrorMessage('Security token not available. Please refresh the page.');
      setSubmitStatus('error');
      return;
    }

    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many registration attempts. Please try again later.');
        } else if (response.status === 400) {
          throw new Error(responseData.error || 'Invalid registration data. Please check your information.');
        } else if (response.status === 403) {
          throw new Error(
            responseData.error === 'CSRF validation failed'
              ? 'Security token expired. Please refresh the page and try again.'
              : 'Access denied. Please refresh the page and try again.'
          );
        } else {
          throw new Error('Registration failed. Please try again.');
        }
      }

      setSubmitStatus('success');
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      setSubmitStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Left Side - Enhanced Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-700/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center space-x-3 mb-16 group">
            <div className="transform transition-transform group-hover:scale-110 duration-300">
              <Logo />
            </div>
          </Link>
          <div>
            <h1 className="text-4xl font-bold mb-4">Join Mintenance</h1>
            <p className="text-lg text-gray-300 mb-8">
              Connect with trusted contractors or find quality work opportunities
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                </div>
                <span>Verified contractors</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                </div>
                <span>Secure payments</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                </div>
                <span>24/7 support</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-600">Get started with Mintenance today</p>
          </div>

          {/* Success Alert */}
          {submitStatus === 'success' && (
            <Alert className="mb-6 border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Registration Successful!</AlertTitle>
              <AlertDescription className="text-green-700">
                Redirecting to your dashboard...
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {submitStatus === 'error' && errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Registration Failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-3">
              <Label>I am a *</Label>
              <RadioGroup
                value={selectedRole}
                onValueChange={(value) => setValue('role', value as 'homeowner' | 'contractor')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="homeowner" id="homeowner" />
                  <Label htmlFor="homeowner" className="font-normal cursor-pointer">
                    Homeowner
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contractor" id="contractor" />
                  <Label htmlFor="contractor" className="font-normal cursor-pointer">
                    Contractor
                  </Label>
                </div>
              </RadioGroup>
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  error={errors.firstName?.message}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  error={errors.lastName?.message}
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="john@example.com"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                error={errors.phone?.message}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                error={errors.password?.message}
                placeholder="At least 8 characters"
              />
              <p className="text-xs text-gray-500">
                Must be at least 8 characters long
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting || csrfLoading}
              disabled={isSubmitting || csrfLoading}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

import { Suspense } from 'react';

