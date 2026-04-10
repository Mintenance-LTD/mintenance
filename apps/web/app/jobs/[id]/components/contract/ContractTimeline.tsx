'use client';

import React from 'react';
import { Clock, FileText, Send, PenTool, CalendarCheck } from 'lucide-react';
import { formatDateTime } from './contractHelpers';
import type { Contract } from './useContractData';

interface ContractTimelineProps {
  contract: Contract;
}

function TimelineItem({
  icon: IconComp,
  color,
  label,
  date,
}: {
  icon: typeof FileText;
  color: 'gray' | 'blue' | 'green' | 'teal';
  label: string;
  date: string;
}) {
  const colors = {
    gray: 'bg-gray-100 text-gray-500',
    blue: 'bg-blue-50 text-blue-500',
    green: 'bg-emerald-50 text-emerald-500',
    teal: 'bg-teal-50 text-teal-600',
  };
  return (
    <div className='flex items-center gap-3 relative'>
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 -ml-6 ${colors[color]} ring-2 ring-white`}
      >
        <IconComp className='w-3 h-3' />
      </div>
      <div className='flex items-center justify-between flex-1 min-w-0'>
        <p className='text-xs font-medium text-gray-700'>{label}</p>
        <p className='text-[10px] text-gray-400 ml-2'>{date}</p>
      </div>
    </div>
  );
}

export function ContractTimeline({ contract }: ContractTimelineProps) {
  return (
    <div className='border-t border-gray-100 pt-6'>
      <div className='flex items-center gap-2 mb-4'>
        <Clock className='w-4 h-4 text-teal-600' />
        <h4 className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
          Timeline
        </h4>
      </div>
      <div className='relative pl-6 space-y-4'>
        <div className='absolute left-[11px] top-1 bottom-1 w-px bg-gray-200' />
        <TimelineItem
          icon={FileText}
          color='gray'
          label='Contract Created'
          date={formatDateTime(contract.created_at)}
        />
        {contract.status !== 'draft' && (
          <TimelineItem
            icon={Send}
            color='blue'
            label='Sent to Homeowner'
            date={formatDateTime(contract.updated_at)}
          />
        )}
        {contract.contractor_signed_at && (
          <TimelineItem
            icon={PenTool}
            color='green'
            label='Contractor Signed'
            date={formatDateTime(contract.contractor_signed_at)}
          />
        )}
        {contract.homeowner_signed_at && (
          <TimelineItem
            icon={PenTool}
            color='green'
            label='Homeowner Signed'
            date={formatDateTime(contract.homeowner_signed_at)}
          />
        )}
        {contract.status === 'accepted' && (
          <TimelineItem
            icon={CalendarCheck}
            color='teal'
            label='Contract Executed'
            date='Both parties signed'
          />
        )}
      </div>
    </div>
  );
}
