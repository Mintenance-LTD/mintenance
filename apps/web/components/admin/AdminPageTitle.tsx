'use client';

import React from 'react';

interface AdminPageTitleProps {
  title: string;
  subtitle?: string;
  breadcrumb?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
}

/**
 * Clean page title matching the Mintenance admin design system.
 * Uses the 2.75rem extrabold tracking-tight typography from mockups.
 *
 * Replaces the heavy gradient AdminPageHeader for pages that
 * just need a clean flat header.
 */
export function AdminPageTitle({
  title,
  subtitle,
  breadcrumb,
  actions,
}: AdminPageTitleProps) {
  return (
    <div className='mb-10'>
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className='flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[#566166] mb-3'>
          {breadcrumb.map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && <span className='text-[#a9b4b9]'>/</span>}
              {item.href ? (
                <a
                  href={item.href}
                  className='hover:text-[#565e74] transition-colors'
                >
                  {item.label}
                </a>
              ) : (
                <span className='text-[#565e74]'>{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-4'>
        <div>
          <h2 className='text-[2.75rem] font-extrabold tracking-tight text-[#2a3439] leading-tight'>
            {title}
          </h2>
          {subtitle && (
            <p className='text-[#566166] text-lg max-w-2xl mt-2'>{subtitle}</p>
          )}
        </div>
        {actions && <div className='flex gap-3 shrink-0'>{actions}</div>}
      </div>
    </div>
  );
}
