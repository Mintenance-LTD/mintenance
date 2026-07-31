'use client';

import { Plus } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

interface CertificationsHeaderProps {
  isMintEditorial: boolean;
  activeTab: 'certifications' | 'training';
  onAdd: () => void;
}

export function CertificationsHeader({
  isMintEditorial,
  activeTab,
  onAdd,
}: CertificationsHeaderProps) {
  // Header — canonical .t-h1 + .btn-primary when Mint Editorial,
  // legacy emerald gradient hero otherwise.
  if (isMintEditorial) {
    return (
      <div
        className='between'
        style={{ alignItems: 'flex-start', padding: '20px 0 24px' }}
      >
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Training & certifications</h1>
          <p className='t-body'>
            Track your DBS, CSCS, Gas Safe, NICEIC, and other trade
            qualifications. Add training courses to keep your profile current.
          </p>
        </div>
        <button
          type='button'
          className='btn btn-primary btn-sm'
          onClick={onAdd}
        >
          <Plus size={14} strokeWidth={1.75} />
          Add {activeTab === 'certifications' ? 'certification' : 'training'}
        </button>
      </div>
    );
  }

  return (
    <MotionDiv
      initial='hidden'
      animate='visible'
      variants={fadeIn}
      className='bg-gradient-to-r from-emerald-600 to-red-600 text-white'
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <h1 className='text-4xl font-bold mb-2'>
              Training & Certifications
            </h1>
            <p className='text-emerald-100'>
              Manage your professional qualifications and training
            </p>
          </div>
          <button
            onClick={onAdd}
            className='flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium'
          >
            <Plus className='w-5 h-5' />
            Add {activeTab === 'certifications' ? 'Certification' : 'Training'}
          </button>
        </div>
      </div>
    </MotionDiv>
  );
}
