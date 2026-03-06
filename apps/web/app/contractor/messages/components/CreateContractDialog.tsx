'use client';

import React, { useEffect, useRef } from 'react';
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
import { AlertCircle, Loader2, FileText, Upload, X, Shield } from 'lucide-react';
import { logger } from '@mintenance/shared';
import { useCSRF } from '@/lib/hooks/useCSRF';
import Image from 'next/image';

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
  insurance_provider: z.string().optional(),
  insurance_policy_number: z.string().optional(),
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate;
}, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

type ContractFormData = z.infer<typeof contractFormSchema>;

export function CreateContractDialog(props: CreateContractDialogProps) {
  const {
    open = false,
    onOpenChange = () => {},
    jobId = '',
    jobTitle = '',
    onContractCreated = () => {},
  } = props || {};
  const [loadingCompanyName, setLoadingCompanyName] = React.useState(true);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [existingLogo, setExistingLogo] = React.useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { csrfToken } = useCSRF();

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
      insurance_provider: '',
      insurance_policy_number: '',
    },
  });

  const contractorLicenseType = watch('contractor_license_type');

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

        // Also fetch profile for insurance and logo
        const profileResponse = await fetch('/api/contractor/profile-data');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.profile) {
            if (profileData.profile.insurance_provider) {
              setValue('insurance_provider', profileData.profile.insurance_provider);
            }
            if (profileData.profile.insurance_policy_number) {
              setValue('insurance_policy_number', profileData.profile.insurance_policy_number);
            }
            if (profileData.profile.company_logo) {
              setExistingLogo(profileData.profile.company_logo);
            }
          }
        }
      } catch (err) {
        logger.error('Error loading contractor info:', err);
      } finally {
        setLoadingCompanyName(false);
      }
    };

    if (open) {
      loadContractorInfo();
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
        insurance_provider: '',
        insurance_policy_number: '',
      });
      setSubmitError(null);
      setLogoFile(null);
      setLogoPreview(null);
    }
  }, [open, jobTitle, setValue, reset]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Logo must be under 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSubmitError('File must be an image');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setSubmitError(null);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const onSubmit = async (data: ContractFormData) => {
    setSubmitError(null);

    try {
      // Upload logo if a new one was selected
      if (logoFile) {
        const formData = new FormData();
        formData.append('profileImage', logoFile);
        // Use update-profile endpoint which already handles file uploads
        const logoResponse = await fetch('/api/contractor/update-profile', {
          method: 'POST',
          headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
          credentials: 'same-origin',
          body: formData,
        });
        if (!logoResponse.ok) {
          logger.warn('Failed to upload company logo, continuing with contract creation');
        }
      }

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
        insurance_provider: data.insurance_provider?.trim() || undefined,
        insurance_policy_number: data.insurance_policy_number?.trim() || undefined,
      };

      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'same-origin',
        body: JSON.stringify(contractData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create contract');
      }

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
          <DialogTitle>Prepare Contract</DialogTitle>
          <DialogDescription>
            Fill in the contract details. This will be sent to the homeowner for review and signature.
          </DialogDescription>
        </DialogHeader>

        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Section: Job Details */}
          <div className="border-b pb-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Scope of Work</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Contract Title *</Label>
            <Input
              id="title"
              {...register('title')}
              errorText={errors.title?.message}
              placeholder="Contract title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description of Work *</Label>
            <Textarea
              id="description"
              {...register('description')}
              errorText={errors.description?.message}
              rows={4}
              placeholder="Describe the work to be performed in detail..."
            />
          </div>

          {/* Section: Payment & Schedule */}
          <div className="border-b pb-3 mb-3 mt-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Payment & Schedule</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Contract Amount (£) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount')}
              errorText={errors.amount?.message}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500">Payment will be held securely in escrow via Mintenance</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="datetime-local"
                {...register('start_date')}
                errorText={errors.start_date?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="datetime-local"
                {...register('end_date')}
                errorText={errors.end_date?.message}
              />
            </div>
          </div>

          {/* Section: Contractor Business Details */}
          <div className="border-b pb-3 mb-3 mt-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Business Details</h3>
          </div>

          {/* Company Logo */}
          <div className="space-y-2">
            <Label>Company Logo (Optional)</Label>
            <div className="flex items-center gap-4">
              {(logoPreview || existingLogo) && (
                <div className="relative w-16 h-16 rounded-lg border overflow-hidden bg-gray-50">
                  <Image
                    src={logoPreview || existingLogo || ''}
                    alt="Company logo"
                    fill
                    className="object-contain"
                  />
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {logoPreview || existingLogo ? 'Change Logo' : 'Upload Logo'}
                </Button>
                <p className="text-xs text-gray-500 mt-1">Max 5MB. Appears on your contract.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractor_company_name">Company Name *</Label>
            <Input
              id="contractor_company_name"
              {...register('contractor_company_name')}
              errorText={errors.contractor_company_name?.message}
              disabled={loadingCompanyName}
              placeholder={loadingCompanyName ? "Loading..." : "Enter your company name"}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractor_license_registration">License Number *</Label>
              <Input
                id="contractor_license_registration"
                {...register('contractor_license_registration')}
                errorText={errors.contractor_license_registration?.message}
                placeholder="e.g. LIC-12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractor_license_type">License Type</Label>
              <Select value={contractorLicenseType || ''} onValueChange={(value: string) => setValue('contractor_license_type', value)}>
                <SelectTrigger id="contractor_license_type">
                  <SelectValue placeholder="Select type" />
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
          </div>

          {/* Insurance Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-700">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-semibold">Insurance Details (Recommended)</span>
            </div>
            <p className="text-xs text-blue-600">Adding insurance details builds trust and shows professionalism</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insurance_provider">Insurance Provider</Label>
                <Input
                  id="insurance_provider"
                  {...register('insurance_provider')}
                  placeholder="e.g. Hiscox, AXA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurance_policy_number">Policy Number</Label>
                <Input
                  id="insurance_policy_number"
                  {...register('insurance_policy_number')}
                  placeholder="e.g. POL-123456"
                />
              </div>
            </div>
          </div>

          {/* Additional Terms */}
          <div className="border-b pb-3 mb-3 mt-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Additional Terms</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Terms & Conditions (Optional)</Label>
            <Textarea
              id="terms"
              {...register('terms')}
              rows={3}
              placeholder="Any additional terms, conditions, or special requirements..."
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
                  Send Contract to Homeowner
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
