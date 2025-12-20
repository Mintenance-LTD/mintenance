'use client';

import { Modal } from '@/components/ui/Modal';
import Link from 'next/link';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  ctaText?: string;
  ctaLink?: string;
}

export function DemoModal({
  isOpen,
  onClose,
  title = "This is a Demo",
  message = "This is a demonstration element. Sign up to access real features!",
  ctaText = "Sign Up Now",
  ctaLink = "/register?role=homeowner",
}: DemoModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth={500}
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ marginBottom: '24px' }}>
          <svg 
            className="w-16 h-16 text-primary mx-auto mb-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            style={{ color: '#1F2937' }}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>
        <p style={{ 
          fontSize: '16px', 
          color: '#374151', 
          marginBottom: '24px',
          lineHeight: '1.6'
        }}>
          {message}
        </p>
        <p style={{ 
          fontSize: '14px', 
          color: '#6B7280', 
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          Join Mintenance today to connect with verified tradespeople and get your projects done!
        </p>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          alignItems: 'center'
        }}>
          <Link
            href={ctaLink}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#1F2937',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1F2937';
            }}
          >
            {ctaText}
          </Link>
          <Link
            href="/contractors"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: '#1F2937',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
              e.currentTarget.style.borderColor = '#D1D5DB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#E5E7EB';
            }}
          >
            Browse All Tradespeople →
          </Link>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#6B7280',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

