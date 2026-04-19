'use client';

import React from 'react';
import { Clock, FileText, X } from 'lucide-react';
import { useContractData } from './contract/useContractData';
import { getStatusConfig, TERMS_HIDDEN_KEYS } from './contract/contractHelpers';
import { ContractHeader } from './contract/ContractHeader';
import { ContractParties } from './contract/ContractParties';
import { ContractScope } from './contract/ContractScope';
import { ContractSignatures } from './contract/ContractSignatures';
import { ContractTimeline } from './contract/ContractTimeline';
import { ContractActions } from './contract/ContractActions';
import { ContractCompactCard } from './contract/ContractCompactCard';

interface ContractManagementProps {
  jobId: string;
  userRole: 'homeowner' | 'contractor';
  userId: string;
}

export function ContractManagement(props: ContractManagementProps) {
  const { jobId = '', userRole = 'homeowner', userId = '' } = props || {};
  const {
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
    handleSignContract,
    handleRejectContract,
    handleDeleteContract,
    handleDownloadPdf,
  } = useContractData(jobId, userRole);

  if (loading) {
    return (
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center'>
        <div className='w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-3'>
          <Clock className='w-5 h-5 text-teal-500 animate-pulse' />
        </div>
        <p className='text-sm text-gray-400'>Loading contract...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center'>
        <div className='w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4'>
          <FileText className='w-7 h-7 text-gray-300' />
        </div>
        <p className='text-gray-500 text-sm font-medium'>
          {userRole === 'contractor'
            ? 'No contract created yet. Use "Prepare Contract" to create one.'
            : 'No contract available yet. The contractor will prepare one shortly.'}
        </p>
      </div>
    );
  }

  const isDraft = contract.status === 'draft';
  const statusConfig = getStatusConfig(contract.status);
  const logoUrl = contract.contractor?.profile_image_url;

  const contractorName =
    contract.contractor?.company_name ||
    (contract.contractor?.first_name && contract.contractor?.last_name
      ? `${contract.contractor.first_name} ${contract.contractor.last_name}`
      : null) ||
    contract.contractor_company_name ||
    'Contractor';
  const homeownerName =
    contract.homeowner?.first_name && contract.homeowner?.last_name
      ? `${contract.homeowner.first_name} ${contract.homeowner.last_name}`
      : 'Homeowner';

  const hasInsurance = !!contract.terms?.insurance_provider;
  const insuranceProvider = contract.terms?.insurance_provider as
    | string
    | undefined;
  const insurancePolicyNumber = contract.terms?.insurance_policy_number as
    | string
    | undefined;
  const visibleTerms = contract.terms
    ? Object.entries(contract.terms).filter(
        ([key]) => !TERMS_HIDDEN_KEYS.includes(key)
      )
    : [];

  const contractDetail = (
    <div className='bg-white rounded-2xl overflow-hidden'>
      <ContractHeader
        logoUrl={logoUrl}
        contractId={contract.id}
        createdAt={contract.created_at}
        statusConfig={statusConfig}
      />
      <div className='p-6 space-y-6'>
        <ContractActions
          contract={contract}
          userRole={userRole}
          isDraft={isDraft}
          canSign={canSign}
          canDelete={canDelete}
          isSigning={isSigning}
          isRejecting={isRejecting}
          isDeleting={isDeleting}
          showRejectForm={showRejectForm}
          rejectReason={rejectReason}
          error={error}
          onSign={handleSignContract}
          onReject={handleRejectContract}
          onDelete={handleDeleteContract}
          onDownloadPdf={handleDownloadPdf}
          onShowRejectForm={setShowRejectForm}
          onRejectReasonChange={setRejectReason}
        />
        <ContractParties
          contractorName={contractorName}
          homeownerName={homeownerName}
          contractorLicenseType={contract.contractor_license_type}
          contractorLicenseRegistration={
            contract.contractor_license_registration
          }
          hasInsurance={hasInsurance}
          insuranceProvider={insuranceProvider}
          insurancePolicyNumber={insurancePolicyNumber}
        />
        <ContractScope contract={contract} visibleTerms={visibleTerms} />
        <ContractSignatures
          contractorName={contractorName}
          homeownerName={homeownerName}
          contractorSignedAt={contract.contractor_signed_at}
          homeownerSignedAt={contract.homeowner_signed_at}
        />
        <ContractTimeline contract={contract} />
        <p className='text-[10px] text-gray-300 text-center pt-4 border-t border-gray-50'>
          Facilitated by Mintenance. Payments held with Protected Payment. By
          signing, both parties agree to the above terms.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <ContractCompactCard
        contract={contract}
        logoUrl={logoUrl}
        statusConfig={statusConfig}
        canSign={canSign}
        isDraft={isDraft}
        onOpenDetail={() => setIsModalOpen(true)}
      />
      {isModalOpen && (
        <div className='mt-4'>
          <div className='flex justify-end mb-2'>
            <button
              onClick={() => setIsModalOpen(false)}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200'
              type='button'
            >
              <X className='w-3.5 h-3.5' /> Close
            </button>
          </div>
          {contractDetail}
        </div>
      )}
    </>
  );
}
