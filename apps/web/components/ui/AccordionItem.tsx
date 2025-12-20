"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

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
  className = "",
  titleClassName = "",
  contentClassName = "",
  onToggle,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  };

  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <button
        onClick={handleToggle}
        className={`w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 transition-colors duration-200 ${titleClassName}`}
        aria-expanded={isOpen}
      >
        <span className="text-base font-medium text-gray-900 pr-4">{title}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className={`pb-4 pt-1 ${contentClassName}`}>
          <div className="text-gray-700 leading-relaxed">{content}</div>
        </div>
      </div>
    </div>
  );
};

interface AccordionProps {
  items: Array<{
    id: string;
    title: string;
    content: React.ReactNode;
  }>;
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  className = "",
}) => {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(defaultOpenIds));

  const handleToggle = (id: string) => {
    const newOpenIds = new Set(openIds);

    if (newOpenIds.has(id)) {
      newOpenIds.delete(id);
    } else {
      if (!allowMultiple) {
        newOpenIds.clear();
      }
      newOpenIds.add(id);
    }

    setOpenIds(newOpenIds);
  };

  return (
    <div className={`divide-y divide-gray-200 ${className}`}>
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          title={item.title}
          content={item.content}
          defaultOpen={openIds.has(item.id)}
          onToggle={() => handleToggle(item.id)}
        />
      ))}
    </div>
  );
};

export default AccordionItem;
