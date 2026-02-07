import { SIDEBAR_SECTIONS } from './types';
import type { SectionKey } from './types';

interface SettingsSidebarProps {
  activeSection: SectionKey;
  onSectionChange: (section: SectionKey) => void;
}

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <aside className="w-1/5 min-w-[200px]">
      <nav className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-8">
        {SIDEBAR_SECTIONS.map((section) => (
          <button
            key={section.key}
            onClick={() => onSectionChange(section.key)}
            className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors border-l-4 ${
              activeSection === section.key
                ? 'border-teal-600 bg-gray-50 font-medium text-gray-900'
                : 'border-transparent text-gray-600'
            }`}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
