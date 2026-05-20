import React from 'react';
import { PoundSterling, Heart, ShieldAlert, Repeat } from 'lucide-react';

export function getNotificationIcon(type: string) {
  switch (type) {
    case 'job':
    case 'job_update':
    case 'job_viewed':
    case 'job_nearby':
      return (
        <svg
          className='w-5 h-5'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
          />
        </svg>
      );
    case 'job_invitation_from_repeat_client':
      return <Repeat className='w-5 h-5' aria-hidden='true' />;
    case 'bid':
    case 'bid_received':
    case 'bid_accepted':
    case 'quote_viewed':
    case 'quote_accepted':
      return <PoundSterling className='w-5 h-5' aria-hidden='true' />;
    case 'job_tip_received':
      return <Heart className='w-5 h-5' aria-hidden='true' />;
    case 'contractor_insurance_expiry':
    case 'contractor_license_expiry':
    case 'contractor_dbs_expiry':
      return <ShieldAlert className='w-5 h-5' aria-hidden='true' />;
    case 'message':
      return (
        <svg
          className='w-5 h-5'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
          />
        </svg>
      );
    case 'payment':
      return (
        <svg
          className='w-5 h-5'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
          />
        </svg>
      );
    case 'project_reminder':
      return (
        <svg
          className='w-5 h-5'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
          />
        </svg>
      );
    case 'system':
      return (
        <svg
          className='w-5 h-5'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
          />
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
          />
        </svg>
      );
    default:
      return (
        <svg
          className='w-5 h-5'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
          />
        </svg>
      );
  }
}

export function getNotificationColor(type: string) {
  switch (type) {
    case 'job':
    case 'job_update':
    case 'job_viewed':
    case 'job_nearby':
      return 'bg-blue-500';
    case 'bid':
    case 'bid_received':
    case 'bid_accepted':
    case 'quote_viewed':
    case 'quote_accepted':
      return 'bg-emerald-500';
    case 'job_invitation_from_repeat_client':
      return 'bg-emerald-600';
    case 'job_tip_received':
      return 'bg-rose-500';
    case 'contractor_insurance_expiry':
    case 'contractor_license_expiry':
    case 'contractor_dbs_expiry':
      return 'bg-amber-600';
    case 'message':
      return 'bg-purple-500';
    case 'payment':
      return 'bg-amber-500';
    case 'project_reminder':
      return 'bg-indigo-500';
    case 'system':
      return 'bg-gray-500';
    default:
      return 'bg-teal-500';
  }
}
