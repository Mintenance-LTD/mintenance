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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const loginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { csrfToken, loading: csrfLoading } = useCSRF();
  const [showPassword, setShowPassword] = React.useState(false);
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
    mode: 'onSubmit', // Only validate on submit, not on mount or change
    reValidateMode: 'onSubmit', // Only revalidate on submit after first validation
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

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

      setSubmitStatus('success');
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Login failed. Please try again.');
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
          <h2 className="text-5xl font-bold mb-6 leading-tight tracking-tight">Welcome Back!</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Sign in to manage your home projects and connect with trusted tradespeople.
          </p>
        </div>
        <div className="text-sm text-gray-400 relative z-10">
          <p className="font-medium">© 2025 MINTENANCE LTD</p>
          <p className="text-gray-500">Company No. 16542104</p>
        </div>
      </div>

      {/* Right Side - Modern Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Logo />
              <h1 className="text-2xl font-bold text-primary">Mintenance</h1>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Sign in</h2>
            <p className="text-base text-gray-600">
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold text-primary hover:text-primary-700 transition-colors">
                Create one
              </Link>
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
                    <Link href="/forgot-password" className="text-sm underline font-medium">
                      Reset your password
                    </Link>
                  </div>
                )}
                {errorMessage.toLowerCase().includes('email') && !errorMessage.toLowerCase().includes('password') && (
                  <div className="mt-2">
                    <Link href="/register" className="text-sm underline font-medium">
                      Create an account
                    </Link>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  error={errors.password?.message}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                {...register('rememberMe')}
                checked={rememberMe}
              />
              <Label htmlFor="remember-me" className="font-normal cursor-pointer text-sm text-gray-600">
                Remember me for 30 days
              </Label>
            </div>

            {/* Submit Button */}
            <div className="relative group">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmitting || csrfLoading}
                disabled={isSubmitting || csrfLoading || !csrfToken}
                className={cn(
                  "transition-all",
                  (!csrfToken && !isSubmitting && !csrfLoading) && "opacity-60 cursor-not-allowed"
                )}
                aria-label={!csrfToken ? "Please wait while we load security settings..." : "Sign in"}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
              {mounted && !csrfToken && !isSubmitting && !csrfLoading && (
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  Please wait while we load security settings...
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </div>
            {mounted && !csrfToken && !isSubmitting && !csrfLoading && (
              <p className="text-xs text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
                <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                Loading security settings...
              </p>
            )}

            {/* Forgot Password Link */}
            <div className="text-center pt-2">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold text-primary hover:text-primary-700 transition-colors">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
