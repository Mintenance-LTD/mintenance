'use client';

import { REPAIR_TEMPLATES, type RepairTemplate } from '../templates';

interface Props {
  selectedTemplateId: string | null;
  onSelect: (template: RepairTemplate) => void;
}

/**
 * 6-template grid for the "Common Repairs" section. Extracted from
 * `quick-create/page.tsx` on 2026-05-09 for AUDIT_PUNCH_LIST P2 #41.
 */
export function RepairTemplatesGrid({ selectedTemplateId, onSelect }: Props) {
  return (
    <div className='bg-white rounded-xl border border-gray-200 p-6 mb-6'>
      <h2 className='text-lg font-semibold text-gray-900 mb-4'>
        Common Repairs
      </h2>
      <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
        {REPAIR_TEMPLATES.map((template) => {
          const Icon = template.icon;
          const isSelected = selectedTemplateId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon
                className={`w-6 h-6 mb-2 ${
                  isSelected ? 'text-teal-600' : 'text-gray-600'
                }`}
              />
              <h3 className='font-semibold text-gray-900 text-sm'>
                {template.title}
              </h3>
              <p className='text-xs text-gray-500 mt-1'>
                {template.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
