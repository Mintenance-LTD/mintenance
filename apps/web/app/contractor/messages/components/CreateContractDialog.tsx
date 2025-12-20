'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, FileText } from 'lucide-react';
import { logger } from '@mintenance/shared';

interface CreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  onContractCreated: () => void;
}

const contractFormSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be greater than 0'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  terms: z.string().optional(),
  contractor_company_name: z.string().min(2, 'Company name is required'),
  contractor_license_registration: z.string().min(2, 'License registration number is required'),
  contractor_license_type: z.string().optional(),
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate;
}, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

type ContractFormData = z.infer<typeof contractFormSchema>;

export function CreateContractDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  onContractCreated,
}: CreateContractDialogProps) {
  const [loadingCompanyName, setLoadingCompanyName] = React.useState(true);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      title: jobTitle,
      description: '',
      amount: '',
      start_date: '',
      end_date: '',
      terms: '',
      contractor_company_name: '',
      contractor_license_registration: '',
      contractor_license_type: '',
    },
  });

  const contractorCompanyName = watch('contractor_company_name');
  const contractorLicenseType = watch('contractor_license_type');

  // Fetch contractor company name and license from verification API
  useEffect(() => {
    const loadContractorInfo = async () => {
      try {
        setLoadingCompanyName(true);
        const response = await fetch('/api/contractor/verification');
        if (response.ok) {
          const verificationData = await response.json();
          if (verificationData.data) {
            setValue('contractor_company_name', verificationData.data.company_name || '');
            setValue('contractor_license_registration', verificationData.data.license_number || '');
          }
        }
      } catch (err) {
        logger.error('Error loading contractor verification info:', err);
      } finally {
        setLoadingCompanyName(false);
      }
    };

    if (open) {
      loadContractorInfo();
      // Reset form when dialog opens
      reset({
        title: jobTitle,
        description: '',
        amount: '',
        start_date: '',
        end_date: '',
        terms: '',
        contractor_company_name: '',
        contractor_license_registration: '',
        contractor_license_type: '',
      });
      setSubmitError(null);
    }
  }, [open, jobTitle, setValue, reset]);

  const onSubmit = async (data: ContractFormData) => {
    setSubmitError(null);

    try {
      const amount = parseFloat(data.amount);
      const startDateObj = new Date(data.start_date);
      const endDateObj = new Date(data.end_date);

      const contractData = {
        job_id: jobId,
        title: data.title.trim(),
        description: data.description.trim(),
        amount: amount,
        start_date: startDateObj.toISOString(),
        end_date: endDateObj.toISOString(),
        terms: data.terms?.trim() || undefined,
        contractor_company_name: data.contractor_company_name.trim(),
        contractor_license_registration: data.contractor_license_registration.trim(),
        contractor_license_type: data.contractor_license_type?.trim() || undefined,
      };

      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create contract');
      }

      // Success
      onContractCreated();
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create contract');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Contract</DialogTitle>
          <DialogDescription>
            Fill out the contract details for this job
          </DialogDescription>
        </DialogHeader>

        {/* Error Message */}
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title')}
              errorText={errors.title?.message}
              placeholder="Contract title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...register('description')}
              errorText={errors.description?.message}
              rows={4}
              placeholder="Describe the work to be performed..."
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (£) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount')}
              errorText={errors.amount?.message}
              placeholder="0.00"
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date *</Label>
            <Input
              id="start_date"
              type="datetime-local"
              {...register('start_date')}
              errorText={errors.start_date?.message}
            />
            <p className="text-xs text-gray-500">
              Select the date and time when work will begin
            </p>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end_date">End Date *</Label>
            <Input
              id="end_date"
              type="datetime-local"
              {...register('end_date')}
              errorText={errors.end_date?.message}
            />
            <p className="text-xs text-gray-500">
              Select the date and time when work will be completed
            </p>
          </div>

          {/* Contractor Company Name */}
          <div className="space-y-2">
            <Label htmlFor="contractor_company_name">Company Name *</Label>
            <Input
              id="contractor_company_name"
              {...register('contractor_company_name')}
              errorText={errors.contractor_company_name?.message}
              disabled={loadingCompanyName}
              placeholder={loadingCompanyName ? "Loading..." : "Enter your company name"}
            />
            {loadingCompanyName && (
              <p className="text-xs text-gray-500">Loading your company name...</p>
            )}
          </div>

          {/* License Registration */}
          <div className="space-y-2">
            <Label htmlFor="contractor_license_registration">License Registration Number *</Label>
            <Input
              id="contractor_license_registration"
              {...register('contractor_license_registration')}
              errorText={errors.contractor_license_registration?.message}
              placeholder="Enter your license registration number"
            />
            <p className="text-xs text-gray-500">
              This will be visible to the homeowner for verification and trust
            </p>
          </div>

          {/* License Type */}
          <div className="space-y-2">
            <Label htmlFor="contractor_license_type">License Type (Optional)</Label>
            <Select value={contractorLicenseType || ''} onValueChange={(value: string) => setValue('contractor_license_type', value)}>
              <SelectTrigger id="contractor_license_type">
                <SelectValue placeholder="Select license type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Select license type</SelectItem>
                <SelectItem value="General Contractor">General Contractor</SelectItem>
                <SelectItem value="Electrical">Electrical</SelectItem>
                <SelectItem value="Plumbing">Plumbing</SelectItem>
                <SelectItem value="HVAC">HVAC</SelectItem>
                <SelectItem value="Roofing">Roofing</SelectItem>
                <SelectItem value="Landscaping">Landscaping</SelectItem>
                <SelectItem value="Painting">Painting</SelectItem>
                <SelectItem value="Carpentry">Carpentry</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Terms */}
          <div className="space-y-2">
            <Label htmlFor="terms">Additional Terms (Optional)</Label>
            <Textarea
              id="terms"
              {...register('terms')}
              rows={3}
              placeholder="Any additional terms or conditions..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || loadingCompanyName}
              loading={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Contract
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

