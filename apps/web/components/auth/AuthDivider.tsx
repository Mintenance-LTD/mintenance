'use client';

import React from 'react';

interface AuthDividerProps {
  text?: string;
}

export function AuthDivider({ text = 'or' }: AuthDividerProps) {
  return (
    <div className="relative flex items-center justify-center py-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300" />
      </div>
      <div className="relative px-4 bg-white">
        <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          {text}
        </span>
      </div>
    </div>
  );
}
