'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '../components/Logo';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { logger } from '@mintenance/shared';
import {
  AuthCard,
  AuthInput,
  PasswordInput,
  AuthBrandSide,
  AuthLink
} from '@/components/auth';

const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { csrfToken, loading: csrfLoading } = useCSRF();
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldUnregister: false,
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const email = watch('email');
  const password = watch('password');
  const rememberMe = watch('rememberMe');

  const onSubmit = async (data: LoginFormData) => {
    if (!csrfToken) {
      setErrorMessage('Security token not available. Please refresh the page.');
      setSubmitStatus('error');
      return;
    }

    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        logger.error('Non-JSON response from login API', new Error('Invalid response format'), {
          service: 'login',
          responsePreview: text.substring(0, 500),
        });
        throw new Error('Server error: Invalid response format. Please try again.');
      }

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many login attempts. Please wait a few minutes and try again.');
        } else if (response.status === 401) {
          const errorMsg = responseData.error || responseData.message || '';
          if (errorMsg.toLowerCase().includes('email') || errorMsg.toLowerCase().includes('not found')) {
            throw new Error('No account found with this email address. Please check your email or sign up for a new account.');
          } else if (errorMsg.toLowerCase().includes('password') || errorMsg.toLowerCase().includes('invalid')) {
            throw new Error('Incorrect password. Please check your password or use "Forgot password" to reset it.');
          } else {
            throw new Error('Invalid email or password. Please check your credentials and try again.');
          }
        } else if (response.status === 403) {
          throw new Error('Access denied. Please refresh the page and try again.');
        } else if (response.status === 400) {
          throw new Error(responseData.error || 'Invalid request. Please check your email and password format.');
        } else {
          throw new Error(responseData.error || 'Login failed. Please try again or contact support if the problem persists.');
        }
      }

      // Check if MFA is required
      if (responseData.requiresMfa && responseData.preMfaToken) {
        // Redirect to MFA verification page
        const redirectParam = searchParams.get('redirect') || '';
        const mfaUrl = `/auth/mfa-verify?token=${responseData.preMfaToken}${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`;
        router.push(mfaUrl);
        return;
      }

      setSubmitStatus('success');
      setTimeout(() => {
        // Redirect based on user role or specified redirect
        const redirect = searchParams.get('redirect');
        if (redirect) {
          router.push(redirect);
        } else if (responseData.user?.role === 'contractor') {
          router.push('/contractor/dashboard-enhanced');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      }, 500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setSubmitStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Brand */}
      <AuthBrandSide
        title="Welcome Back!"
        description="Sign in to manage your projects and connect with top-tier professionals."
        role={null}
      />

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center space-x-2 mb-4">
              <Logo className="w-8 h-8" />
              <h1 className="text-2xl font-bold text-[#0066CC]">Mintenance</h1>
            </Link>
          </div>

          {/* Card */}
          <AuthCard>
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                Sign in
              </h2>
              <p className="text-base text-gray-600">
                New to Mintenance?{' '}
                <AuthLink href="/register" variant="primary">
                  Create an account
                </AuthLink>
              </p>
            </div>

            {/* Success Alert */}
            {submitStatus === 'success' && (
              <Alert className="mb-6 border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Login Successful!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Redirecting to your dashboard...
                </AlertDescription>
              </Alert>
            )}

            {/* Error Alert */}
            {submitStatus === 'error' && errorMessage && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>
                  {errorMessage}
                  {(errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('incorrect')) && (
                    <div className="mt-2">
                      <AuthLink href="/forgot-password" variant="primary" className="text-sm underline">
                        Reset your password
                      </AuthLink>
                    </div>
                  )}
                  {errorMessage.toLowerCase().includes('email') && !errorMessage.toLowerCase().includes('password') && (
                    <div className="mt-2">
                      <AuthLink href="/register" variant="primary" className="text-sm underline">
                        Create an account
                      </AuthLink>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Input */}
              <AuthInput
                label="Email address"
                type="email"
                icon={<Mail className="w-5 h-5" />}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                showSuccess={!!email && !errors.email}
                {...register('email')}
                error={errors.email?.message}
              />

              {/* Password Input */}
              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                autoComplete="current-password"
                {...register('password')}
                error={errors.password?.message}
                value={password}
              />

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    {...register('rememberMe')}
                    checked={rememberMe}
                  />
                  <Label htmlFor="remember-me" className="font-normal cursor-pointer text-sm text-gray-600">
                    Remember me
                  </Label>
                </div>
                <AuthLink href="/forgot-password" variant="primary" className="text-sm">
                  Forgot password?
                </AuthLink>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmitting || csrfLoading}
                disabled={isSubmitting || csrfLoading || !csrfToken}
                className="mt-6 bg-[#0066CC] hover:bg-[#0052A3] text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>

              {mounted && !csrfToken && !isSubmitting && !csrfLoading && (
                <p className="text-xs text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                  Loading security settings...
                </p>
              )}
            </form>

            {/* Footer Links */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <AuthLink href="/register" variant="primary">
                  Sign up for free
                </AuthLink>
              </p>
            </div>
          </AuthCard>

          {/* Legal Links */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <AuthLink href="/terms" variant="muted">Terms</AuthLink>
              <span>•</span>
              <AuthLink href="/privacy" variant="muted">Privacy</AuthLink>
              <span>•</span>
              <AuthLink href="/help" variant="muted">Help</AuthLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
