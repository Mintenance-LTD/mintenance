'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCSRF } from '@/lib/hooks/useCSRF';

export interface ContractorProfile {
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  profile_image_url: string | null;
  insurance_expiry_date: string | null;
}

export interface HomeownerProfile {
  first_name: string | null;
  last_name: string | null;
}

export interface Contract {
  id: string;
  job_id: string;
  contractor_id: string;
  homeowner_id: string;
  status:
    | 'draft'
    | 'pending_contractor'
    | 'pending_homeowner'
    | 'accepted'
    | 'rejected'
    | 'cancelled';
  title: string | null;
  description: string | null;
  amount: number;
  start_date: string | null;
  end_date: string | null;
  contractor_signed_at: string | null;
  homeowner_signed_at: string | null;
  contractor_company_name: string | null;
  contractor_license_registration: string | null;
  contractor_license_type: string | null;
  terms: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  contractor: ContractorProfile | null;
  homeowner: HomeownerProfile | null;
}

export function useContractData(jobId: string, userRole: string) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { csrfToken } = useCSRF();

  const fetchContract = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts?job_id=${jobId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setContract(null);
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch contract');
      }
      const data = await response.json();
      setContract(data.contracts?.[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contract');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const headers = {
    'Content-Type': 'application/json',
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
  };

  const handleSignContract = async () => {
    if (!contract || isSigning) return;
    setIsSigning(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/accept`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const d = await response.json().catch(() => ({}));
        throw new Error(d.error?.message || d.error || 'Failed to sign');
      }
      await fetchContract();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign contract');
    } finally {
      setIsSigning(false);
    }
  };

  const handleRejectContract = async () => {
    if (!contract || isRejecting) return;
    setIsRejecting(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/reject`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!response.ok) {
        const d = await response.json().catch(() => ({}));
        throw new Error(
          d.error?.message || d.error || 'Failed to request changes'
        );
      }
      setShowRejectForm(false);
      setRejectReason('');
      await fetchContract();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to request changes'
      );
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDeleteContract = async () => {
    if (!contract || isDeleting) return;
    if (
      !confirm(
        'Are you sure you want to delete this contract? This cannot be undone.'
      )
    )
      return;
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/delete`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const d = await response.json().catch(() => ({}));
        throw new Error(d.error?.message || d.error || 'Failed to delete');
      }
      await fetchContract();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete contract'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!contract) return;
    const link = document.createElement('a');
    link.href = `/api/contracts/${contract.id}/pdf`;
    link.download = `Contract-${contract.id.slice(0, 8).toUpperCase()}.pdf`;
    link.click();
  };

  const canDelete =
    contract &&
    userRole === 'contractor' &&
    !contract.homeowner_signed_at &&
    ['draft', 'pending_homeowner', 'pending_contractor'].includes(
      contract.status
    );

  const needsSignature =
    contract &&
    ((userRole === 'contractor' && contract.status === 'pending_contractor') ||
      (userRole === 'homeowner' && contract.status === 'pending_homeowner'));
  const canSign =
    needsSignature &&
    ((userRole === 'contractor' && !contract.contractor_signed_at) ||
      (userRole === 'homeowner' && !contract.homeowner_signed_at));

  // Close modal on Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  return {
    contract,
    loading,
    error,
    isSigning,
    isRejecting,
    isDeleting,
    showRejectForm,
    setShowRejectForm,
    rejectReason,
    setRejectReason,
    isModalOpen,
    setIsModalOpen,
    canDelete,
    canSign,
    needsSignature,
    handleSignContract,
    handleRejectContract,
    handleDeleteContract,
    handleDownloadPdf,
  };
}
