'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
// Note: native <select> used for license type to avoid Radix portal conflicts inside Dialog
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, FileText, Shield } from 'lucide-react';
import { logger } from '@mintenance/shared';
import { useCSRF } from '@/lib/hooks/useCSRF';

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
  const [existingContractStatus, setExistingContractStatus] = React.useState<string | null>(null);
  const { csrfToken } = useCSRF();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
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

  useEffect(() => {
    if (!open) return;

    // Reset form first, then load async data to populate fields
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
    setExistingContractStatus(null);

    const loadData = async () => {
      try {
        setLoadingCompanyName(true);

        // Load contractor info, existing contract, and accepted bid in parallel
        const [verificationRes, profileRes, contractRes, bidsRes] = await Promise.all([
          fetch('/api/contractor/verification'),
          fetch('/api/contractor/profile-data'),
          jobId ? fetch(`/api/contracts?job_id=${jobId}`) : Promise.resolve(null),
          jobId ? fetch(`/api/contractor/bids?status=accepted`) : Promise.resolve(null),
        ]);

        if (verificationRes.ok) {
          const verificationData = await verificationRes.json();
          if (verificationData.data) {
            setValue('contractor_company_name', verificationData.data.company_name || '');
            setValue('contractor_license_registration', verificationData.data.license_number || '');
          }
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.profile) {
            if (profileData.profile.insurance_provider) {
              setValue('insurance_provider', profileData.profile.insurance_provider);
            }
            if (profileData.profile.insurance_policy_number) {
              setValue('insurance_policy_number', profileData.profile.insurance_policy_number);
            }
          }
        }

        // Get amount: prefer contract amount > 0, else fall back to accepted bid amount
        let amount: number | null = null;

        if (contractRes?.ok) {
          const data = await contractRes.json();
          const existing = (data.contracts || [])[0];
          if (existing) {
            setExistingContractStatus(existing.status);
            if (existing.amount && Number(existing.amount) > 0) {
              amount = Number(existing.amount);
            }
          }
        }

        if (amount === null && bidsRes?.ok) {
          const bidsData = await bidsRes.json();
          const acceptedBid = (bidsData.bids || []).find(
            (b: { job_id: string; status: string; amount: number }) => b.job_id === jobId
          );
          if (acceptedBid?.amount && Number(acceptedBid.amount) > 0) {
            amount = Number(acceptedBid.amount);
          }
        }

        if (amount !== null) {
          setValue('amount', String(amount));
        }
      } catch (err) {
        logger.error('Error loading contract dialog data:', err);
      } finally {
        setLoadingCompanyName(false);
      }
    };

    loadData();
  }, [open, jobId, jobTitle, setValue, reset]);

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
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || errorData.error || 'Failed to create contract';
        throw new Error(typeof errorMsg === 'string' ? errorMsg : 'Failed to create contract');
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

        {existingContractStatus && existingContractStatus !== 'draft' && (
          <Alert variant={existingContractStatus === 'accepted' ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {existingContractStatus === 'accepted' ? 'Contract Signed' :
               existingContractStatus === 'rejected' ? 'Contract Rejected' :
               'Contract Already Sent'}
            </AlertTitle>
            <AlertDescription>
              {existingContractStatus === 'pending_homeowner'
                ? 'A contract has already been sent to the homeowner and is awaiting their signature. Submitting again will update the existing contract.'
                : existingContractStatus === 'accepted'
                ? 'This contract has been signed by both parties. No further changes can be made.'
                : existingContractStatus === 'rejected'
                ? 'The homeowner has requested changes to the contract. You can update and resend it.'
                : `A finalized contract already exists for this job (status: ${existingContractStatus.replace('_', ' ')}).`}
            </AlertDescription>
          </Alert>
        )}

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
              <select
                id="contractor_license_type"
                {...register('contractor_license_type')}
                className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select type</option>
                <option value="General Contractor">General Contractor</option>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="HVAC">HVAC</option>
                <option value="Roofing">Roofing</option>
                <option value="Landscaping">Landscaping</option>
                <option value="Painting">Painting</option>
                <option value="Carpentry">Carpentry</option>
                <option value="Other">Other</option>
              </select>
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
              disabled={isSubmitting || loadingCompanyName || existingContractStatus === 'accepted'}
              loading={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {existingContractStatus === 'pending_homeowner' ? 'Updating...' : 'Creating...'}
                </>
              ) : existingContractStatus === 'accepted' ? (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Contract Already Signed
                </>
              ) : existingContractStatus === 'pending_homeowner' ? (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Update & Resend Contract
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
