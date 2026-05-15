import Link from 'next/link';
import { SIDEBAR_SECTIONS } from './types';
import type { SectionKey } from './types';

interface SettingsSidebarProps {
  activeSection: SectionKey;
  onSectionChange: (section: SectionKey) => void;
}

/**
 * Settings section nav — Direction A · Mint Editorial. A secondary,
 * in-page nav rail (the global nav lives in the Mint Editorial shell
 * sidebar). Styled on the `--me-*` tokens.
 */
export function SettingsSidebar({
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  return (
    <aside style={{ width: '22%', minWidth: 200 }}>
      <nav
        className='card'
        style={{ overflow: 'hidden', position: 'sticky', top: 24 }}
      >
        {SIDEBAR_SECTIONS.map((section) => {
          const active = activeSection === section.key;
          const itemStyle: React.CSSProperties = {
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '13px 18px',
            fontSize: 14,
            borderLeft: `3px solid ${
              active ? 'var(--me-brand)' : 'transparent'
            }`,
            background: active ? 'var(--me-brand-soft)' : 'transparent',
            color: active ? 'var(--me-brand)' : 'var(--me-ink-2)',
            fontWeight: active ? 600 : 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            textDecoration: 'none',
          };

          // Audit follow-up (2026-04-29): if a section declares an
          // `href`, route the user to that dedicated page instead of
          // toggling the in-page `activeSection`.
          if (section.href) {
            return (
              <Link key={section.key} href={section.href} style={itemStyle}>
                {section.label}
              </Link>
            );
          }

          return (
            <button
              key={section.key}
              onClick={() => onSectionChange(section.key)}
              style={{
                ...itemStyle,
                border: 0,
                borderLeft: itemStyle.borderLeft,
              }}
            >
              {section.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
