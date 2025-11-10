'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

const registerFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number').optional().or(z.literal('')),
  role: z.enum(['homeowner', 'contractor']),
});

type RegisterFormData = z.infer<typeof registerFormSchema>;

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
  const [passwordFocused, setPasswordFocused] = React.useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = React.useState(false);

  const selectedRole = watch('role');
  const password = watch('password');

  useEffect(() => {
    if (roleParam === 'contractor' || roleParam === 'homeowner') {
      setValue('role', roleParam);
    }
  }, [roleParam, setValue]);

  // Show password requirements when focused or has content
  useEffect(() => {
    setShowPasswordRequirements(passwordFocused || Boolean(password && password.length > 0));
  }, [passwordFocused, password]);

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
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-700/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center space-x-3 mb-16 group">
            <div className="transform transition-transform group-hover:scale-110 duration-300">
              <Logo />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Mintenance</h1>
          </Link>
          <div>
            <h2 className="text-5xl font-bold mb-6 leading-tight tracking-tight">Join Mintenance Today</h2>
            <p className="text-xl text-gray-300 mb-10 leading-relaxed">
              {selectedRole === 'homeowner'
                ? 'Find trusted tradespeople for your home projects'
                : 'Grow your business and find quality projects'}
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-4 group">
                <div className="p-2 bg-secondary/20 rounded-lg group-hover:bg-secondary/30 transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                </div>
                <p className="text-gray-200 leading-relaxed">Verified tradespeople only</p>
              </div>
              <div className="flex items-start gap-4 group">
                <div className="p-2 bg-secondary/20 rounded-lg group-hover:bg-secondary/30 transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                </div>
                <p className="text-gray-200 leading-relaxed">Secure payment protection</p>
              </div>
              <div className="flex items-start gap-4 group">
                <div className="p-2 bg-secondary/20 rounded-lg group-hover:bg-secondary/30 transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                </div>
                <p className="text-gray-200 leading-relaxed">AI-powered matching</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-400 relative z-10">
          <p className="font-medium">© 2025 MINTENANCE LTD</p>
          <p className="text-gray-500">Company No. 16542104</p>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Logo />
              <h1 className="text-2xl font-bold text-primary">Mintenance</h1>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Get started</h2>
            <p className="text-base text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary hover:text-primary-700 transition-colors">
                Sign in
              </Link>
            </p>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                    Tradesperson
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
                <Label htmlFor="firstName">First name *</Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  error={errors.firstName?.message}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name *</Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  error={errors.lastName?.message}
                  placeholder="Smith"
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email address *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {/* Phone Input */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                error={errors.phone?.message}
                placeholder="+44 7700 900000"
                autoComplete="tel"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                error={errors.password?.message}
                placeholder="••••••••"
                autoComplete="new-password"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              {showPasswordRequirements && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 animate-in fade-in slide-in-from-top-2">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Password must contain:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className={`flex items-center gap-2 transition-colors ${password && password.length >= 8 ? 'text-green-600' : ''}`}>
                      <span>{password && password.length >= 8 ? '✓' : '•'}</span>
                      <span>At least 8 characters</span>
                    </li>
                    <li className={`flex items-center gap-2 transition-colors ${password && /[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-green-600' : ''}`}>
                      <span>{password && /[A-Z]/.test(password) && /[a-z]/.test(password) ? '✓' : '•'}</span>
                      <span>One uppercase & lowercase letter</span>
                    </li>
                    <li className={`flex items-center gap-2 transition-colors ${password && /\d/.test(password) && /[^a-zA-Z0-9]/.test(password) ? 'text-green-600' : ''}`}>
                      <span>{password && /\d/.test(password) && /[^a-zA-Z0-9]/.test(password) ? '✓' : '•'}</span>
                      <span>One number & special character</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting || csrfLoading}
              disabled={isSubmitting || csrfLoading || !csrfToken}
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              By signing up, you agree to our{' '}
              <Link href="/terms" className="font-semibold text-primary hover:text-primary-700 transition-colors">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-semibold text-primary hover:text-primary-700 transition-colors">
                Privacy Policy
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
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
