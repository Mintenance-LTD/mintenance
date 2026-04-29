import Link from 'next/link';
import { SIDEBAR_SECTIONS } from './types';
import type { SectionKey } from './types';

interface SettingsSidebarProps {
  activeSection: SectionKey;
  onSectionChange: (section: SectionKey) => void;
}

export function SettingsSidebar({
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  return (
    <aside className='w-1/5 min-w-[200px]'>
      <nav className='bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-8'>
        {SIDEBAR_SECTIONS.map((section) => {
          const itemClass = `w-full text-left block px-6 py-4 hover:bg-gray-50 transition-colors border-l-4 ${
            activeSection === section.key
              ? 'border-teal-600 bg-gray-50 font-medium text-gray-900'
              : 'border-transparent text-gray-600'
          }`;

          // Audit follow-up (2026-04-29): if a section declares an
          // `href`, route the user to that dedicated page instead of
          // toggling the in-page `activeSection`. Currently used by
          // "Notifications" → `/settings/notifications` so the
          // canonical preference UI is reached from the main sidebar
          // (the in-page `<NotificationsSection>` posts to the legacy
          // plural endpoint and would otherwise drift apart from the
          // mobile + canonical surface).
          if (section.href) {
            return (
              <Link key={section.key} href={section.href} className={itemClass}>
                {section.label}
              </Link>
            );
          }

          return (
            <button
              key={section.key}
              onClick={() => onSectionChange(section.key)}
              className={itemClass}
            >
              {section.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
