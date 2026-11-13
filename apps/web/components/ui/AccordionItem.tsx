'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItemProps {
  title: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  onToggle?: (isOpen: boolean) => void;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  content,
  defaultOpen = false,
  className = '',
  titleClassName = '',
  contentClassName = '',
  onToggle,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  };

  return (
    <div
      className={className}
      style={{ borderBottom: '1px solid var(--me-line)' }}
    >
      <button
        onClick={handleToggle}
        className={`w-full flex items-center justify-between py-4 text-left transition-colors duration-200 ${titleClassName}`}
        aria-expanded={isOpen}
      >
        <span
          className='text-base font-medium pr-4'
          style={{ color: 'var(--me-ink)' }}
        >
          {title}
        </span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
          style={{ color: 'var(--me-ink-3)' }}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className={`pb-4 pt-1 ${contentClassName}`}>
          <div className='leading-relaxed' style={{ color: 'var(--me-ink-2)' }}>
            {content}
          </div>
        </div>
      </div>
    </div>
  );
};
