'use client';

import React, { useState } from 'react';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface VerificationDocument {
  id: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export default function ContractorVerificationPage2025() {
  const { user } = useCurrentUser();
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<VerificationDocument[]>([
    {
      id: '1',
      type: 'Government ID',
      status: 'approved',
      uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      type: 'Business License',
      status: 'pending',
      uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]);

  const userDisplayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.email || '';

  const verificationSteps = [
    {
      id: 'identity',
      title: 'Identity Verification',
      description: 'Upload a government-issued ID (passport, driver\'s license)',
      status: documents.find(d => d.type === 'Government ID')?.status || 'not_started',
      required: true,
    },
    {
      id: 'business',
      title: 'Business License',
      description: 'Upload your business license or registration',
      status: documents.find(d => d.type === 'Business License')?.status || 'not_started',
      required: true,
    },
    {
      id: 'insurance',
      title: 'Insurance Certificate',
      description: 'Upload proof of liability insurance',
      status: documents.find(d => d.type === 'Insurance')?.status || 'not_started',
      required: false,
    },
    {
      id: 'certifications',
      title: 'Professional Certifications',
      description: 'Upload any relevant trade certifications',
      status: 'not_started' as const,
      required: false,
    },
  ];

  const handleFileUpload = async (documentType: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('type', documentType);

    try {
      const response = await fetch('/api/contractor/verification/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments([...documents, data.document]);
        toast.success('Document uploaded successfully! Review typically takes 1-2 business days.');
      } else {
        toast.error('Failed to upload document');
      }
    } catch (error) {
      toast.error('Error uploading document');
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-6 h-6 text-amber-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-6 h-6 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      approved: 'bg-emerald-100 text-emerald-700 border-emerald-600',
      pending: 'bg-amber-100 text-amber-700 border-amber-600',
      rejected: 'bg-rose-100 text-rose-700 border-rose-600',
      not_started: 'bg-gray-100 text-gray-700 border-gray-600',
    };
    const labels = {
      approved: 'Approved',
      pending: 'Under Review',
      rejected: 'Rejected',
      not_started: 'Not Started',
    };
    return (
      <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const overallProgress = verificationSteps.filter(s => s.status === 'approved').length / verificationSteps.filter(s => s.required).length * 100;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="contractor"
        userInfo={{
          name: userDisplayName,
          email: user?.email || '',
          avatar: (user as any)?.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-1">Verification Center</h1>
                <p className="text-teal-100 text-lg">Complete your profile verification to unlock full access</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-semibold">Verification Progress</span>
                <span className="text-white font-bold">{Math.round(overallProgress)}%</span>
              </div>
              <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                <MotionDiv
                  className="h-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallProgress}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <div className="h-full w-full" />
                </MotionDiv>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-8 py-8 w-full">
          {/* Benefits Banner */}
          <MotionDiv
            className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-6 mb-8 text-white"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <h2 className="text-2xl font-bold mb-4">Why Get Verified?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-bold mb-1">Build Trust</h3>
                  <p className="text-teal-100 text-sm">Verified badge increases homeowner confidence</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                <div>
                  <h3 className="font-bold mb-1">More Opportunities</h3>
                  <p className="text-teal-100 text-sm">Access to premium jobs and higher budgets</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-bold mb-1">Priority Ranking</h3>
                  <p className="text-teal-100 text-sm">Appear higher in search results</p>
                </div>
              </div>
            </div>
          </MotionDiv>

          {/* Verification Steps */}
          <MotionDiv
            className="space-y-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {verificationSteps.map((step, index) => (
              <MotionDiv
                key={step.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                variants={staggerItem}
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    {getStatusIcon(step.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                          {step.title}
                          {step.required && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-semibold">Required</span>
                          )}
                        </h3>
                        <p className="text-gray-600">{step.description}</p>
                      </div>
                      {getStatusBadge(step.status)}
                    </div>

                    {step.status === 'not_started' && (
                      <div className="mt-4">
                        <input
                          type="file"
                          id={`upload-${step.id}`}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(step.title, e.target.files)}
                        />
                        <label
                          htmlFor={`upload-${step.id}`}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 cursor-pointer transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload Document
                        </label>
                      </div>
                    )}

                    {step.status === 'pending' && (
                      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-amber-800 text-sm">
                          📋 Your document is under review. This typically takes 1-2 business days.
                        </p>
                      </div>
                    )}

                    {step.status === 'approved' && (
                      <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <p className="text-emerald-800 text-sm">
                          ✓ Document verified successfully!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </MotionDiv>
            ))}
          </MotionDiv>

          {/* Help Section */}
          <MotionDiv
            className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help?</h2>
            <p className="text-gray-600 mb-6">
              Having trouble with verification? Our support team is here to help.
            </p>
            <button className="px-6 py-3 bg-gray-100 text-gray-900 rounded-xl font-semibold hover:bg-gray-200 transition-all">
              Contact Support
            </button>
          </MotionDiv>
        </div>
      </main>
    </div>
  );
}
