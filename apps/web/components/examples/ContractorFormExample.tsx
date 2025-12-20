'use client';

import React from 'react';
import { logger } from '@mintenance/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Example form schema using Zod
 * This demonstrates validation for a contractor profile form
 */
const contractorFormSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number'),
  serviceType: z.enum(['plumbing', 'electrical', 'hvac', 'general'], {
    required_error: 'Please select a service type',
  }),
  experience: z.enum(['beginner', 'intermediate', 'expert'], {
    required_error: 'Please select experience level',
  }),
  certifications: z.array(z.string()).min(1, 'Select at least one certification'),
  available: z.boolean(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

type ContractorFormData = z.infer<typeof contractorFormSchema>;

interface ContractorFormProps {
  onSubmit?: (data: ContractorFormData) => void | Promise<void>;
  defaultValues?: Partial<ContractorFormData>;
}

/**
 * Example form component using React Hook Form + Zod
 * 
 * Features:
 * - Type-safe form validation
 * - Error handling
 * - Success/error alerts
 * - Multiple input types (text, select, radio, checkbox, switch)
 */
export function ContractorForm({ onSubmit, defaultValues }: ContractorFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<ContractorFormData>({
    resolver: zodResolver(contractorFormSchema),
    defaultValues: {
      companyName: '',
      email: '',
      phone: '',
      certifications: [],
      available: true,
      termsAccepted: false,
      ...defaultValues,
    },
  });

  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const certifications = watch('certifications');

  const handleFormSubmit = async (data: ContractorFormData) => {
    try {
      setSubmitStatus('idle');
      await onSubmit?.(data);
      setSubmitStatus('success');
    } catch (error) {
      setSubmitStatus('error');
      logger.error('Form submission error:', error);
    }
  };

  const toggleCertification = (cert: string) => {
    const current = certifications || [];
    if (current.includes(cert)) {
      setValue('certifications', current.filter((c) => c !== cert));
    } else {
      setValue('certifications', [...current, cert]);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Success Alert */}
      {submitStatus === 'success' && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success!</AlertTitle>
          <AlertDescription className="text-green-700">
            Your contractor profile has been submitted successfully.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {submitStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was an error submitting your form. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Company Name */}
      <div className="space-y-2">
        <Label htmlFor="companyName">Company Name *</Label>
        <Input
          id="companyName"
          {...register('companyName')}
          error={errors.companyName?.message}
          placeholder="ABC Contractors Inc."
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
          placeholder="contact@company.com"
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

      {/* Service Type - Select */}
      <div className="space-y-2">
        <Label htmlFor="serviceType">Service Type *</Label>
        <Select
          onValueChange={(value) => setValue('serviceType', value as any)}
          defaultValue={watch('serviceType')}
        >
          <SelectTrigger id="serviceType">
            <SelectValue placeholder="Select service type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plumbing">Plumbing</SelectItem>
            <SelectItem value="electrical">Electrical</SelectItem>
            <SelectItem value="hvac">HVAC</SelectItem>
            <SelectItem value="general">General Maintenance</SelectItem>
          </SelectContent>
        </Select>
        {errors.serviceType && (
          <p className="text-sm text-red-600">{errors.serviceType.message}</p>
        )}
      </div>

      {/* Experience Level - Radio Group */}
      <div className="space-y-2">
        <Label>Experience Level *</Label>
        <RadioGroup
          onValueChange={(value) => setValue('experience', value as any)}
          defaultValue={watch('experience')}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="beginner" id="beginner" />
            <Label htmlFor="beginner" className="font-normal cursor-pointer">
              Beginner (0-2 years)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="intermediate" id="intermediate" />
            <Label htmlFor="intermediate" className="font-normal cursor-pointer">
              Intermediate (3-5 years)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="expert" id="expert" />
            <Label htmlFor="expert" className="font-normal cursor-pointer">
              Expert (5+ years)
            </Label>
          </div>
        </RadioGroup>
        {errors.experience && (
          <p className="text-sm text-red-600">{errors.experience.message}</p>
        )}
      </div>

      {/* Certifications - Checkboxes */}
      <div className="space-y-2">
        <Label>Certifications *</Label>
        <div className="space-y-3">
          {['Licensed', 'Bonded', 'Insured', 'EPA Certified'].map((cert) => (
            <div key={cert} className="flex items-center space-x-2">
              <Checkbox
                id={cert}
                checked={certifications?.includes(cert)}
                onCheckedChange={() => toggleCertification(cert)}
              />
              <Label htmlFor={cert} className="font-normal cursor-pointer">
                {cert}
              </Label>
            </div>
          ))}
        </div>
        {errors.certifications && (
          <p className="text-sm text-red-600">{errors.certifications.message}</p>
        )}
      </div>

      {/* Available - Switch */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="available">Available for new jobs</Label>
          <p className="text-sm text-muted-foreground">
            Toggle your availability status
          </p>
        </div>
        <Switch
          id="available"
          checked={watch('available')}
          onCheckedChange={(checked) => setValue('available', checked)}
        />
      </div>

      {/* Terms - Checkbox */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="terms"
          checked={watch('termsAccepted')}
          onCheckedChange={(checked) => setValue('termsAccepted', checked === true)}
        />
        <div className="space-y-1 leading-none">
          <Label htmlFor="terms" className="font-normal cursor-pointer">
            I accept the terms and conditions *
          </Label>
          {errors.termsAccepted && (
            <p className="text-sm text-red-600">{errors.termsAccepted.message}</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Contractor Profile'}
      </Button>
    </form>
  );
}

