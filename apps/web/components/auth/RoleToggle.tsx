'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Home, Wrench } from 'lucide-react';

export type Role = 'homeowner' | 'contractor';

interface RoleToggleProps {
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
}

export function RoleToggle({ value, onChange, disabled }: RoleToggleProps) {
  return (
    <div className="w-full p-1 bg-gray-100 rounded-xl flex gap-1">
      <button
        type="button"
        onClick={() => onChange('homeowner')}
        disabled={disabled}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          value === 'homeowner'
            ? "bg-white text-[#0066CC] shadow-md"
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        <Home className="w-4 h-4" />
        I'm a Homeowner
      </button>
      <button
        type="button"
        onClick={() => onChange('contractor')}
        disabled={disabled}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          value === 'contractor'
            ? "bg-white text-[#0066CC] shadow-md"
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        <Wrench className="w-4 h-4" />
        I'm a Contractor
      </button>
    </div>
  );
}
