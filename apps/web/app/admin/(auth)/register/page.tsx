'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/app/components/Logo';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

const adminRegisterSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address').refine(
    (email) => email.endsWith('@mintenance.co.uk'),
    'Admin accounts must use @mintenance.co.uk email address'
  ),
  phone: z.string().optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

type AdminRegisterFormData = z.infer<typeof adminRegisterSchema>;

export default function AdminRegisterPage() {
  const router = useRouter();
  const { csrfToken, loading: csrfLoading } = useCSRF();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<AdminRegisterFormData>({
    resolver: zodResolver(adminRegisterSchema),
  });

  const onSubmit = async (data: AdminRegisterFormData) => {
    if (!csrfToken) {
      setError('root', {
        message: 'Security token not available. Please refresh the page.',
      });
      return;
    }

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
          phone: data.phone?.trim() || undefined,
          role: 'admin',
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many registration attempts. Please try again later.');
        } else if (response.status === 400) {
          const errorMessage = responseData.error || 'Invalid registration data. Please check your information.';
          const details = responseData.details || responseData.errors;
          if (details && typeof details === 'object') {
            const detailMessages = Object.entries(details)
              .map(([field, errors]) => {
                const errorArray = Array.isArray(errors) ? errors : [errors];
                return `${field}: ${errorArray.join(', ')}`;
              })
              .join('\n');
            throw new Error(`${errorMessage}\n\n${detailMessages}`);
          }
          throw new Error(errorMessage);
        } else if (response.status === 403) {
          throw new Error('Access denied. Please refresh the page and try again.');
        } else {
          throw new Error('Registration failed. Please try again.');
        }
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Registration failed. Please try again.',
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex w-1/2 bg-primary text-white p-12 flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center space-x-2 mb-12">
            <Logo />
            <h1 className="text-3xl font-bold">Mintenance</h1>
          </Link>
          <h2 className="text-4xl font-bold mb-6">Admin Registration</h2>
          <p className="text-xl text-gray-300 mb-4">
            Create an admin account to access the administrative dashboard.
          </p>
          <Alert className="bg-yellow-50 bg-opacity-10 border-yellow-200 border-opacity-30">
            <AlertCircle className="h-4 w-4 text-yellow-100" />
            <AlertTitle className="text-yellow-100">Note</AlertTitle>
            <AlertDescription className="text-yellow-100">
              Only @mintenance.co.uk email addresses are allowed for admin accounts.
            </AlertDescription>
          </Alert>
        </div>
        <div className="text-sm text-gray-400">
          <p>© 2025 MINTENANCE LTD</p>
          <p>Company No. 16542104</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Admin Account</h2>
          <p className="text-gray-600 mb-8">
            Already have an account?{' '}
            <Link href="/admin/login" className="font-medium text-primary hover:text-primary-dark">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errors.root && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="whitespace-pre-line">
                  {errors.root.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  {...register('firstName')}
                  errorText={errors.firstName?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Smith"
                  {...register('lastName')}
                  errorText={errors.lastName?.message}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="liam@mintenance.co.uk"
                {...register('email')}
                errorText={errors.email?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+44 7700 900000"
                {...register('phone')}
                errorText={errors.phone?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                errorText={errors.password?.message}
              />
              <p className="text-xs text-gray-500">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting || csrfLoading}
              leftIcon={isSubmitting || csrfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            >
              {csrfLoading ? 'Loading...' : isSubmitting ? 'Creating account...' : 'Create Admin Account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
