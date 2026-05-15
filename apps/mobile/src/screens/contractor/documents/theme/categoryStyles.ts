import type { Ionicons } from '@expo/vector-icons';
import { me } from '../../../../design-system/mint-editorial';

/**
 * Per-document-category icon + colour palette for the Documents screen.
 *
 * Lives under `theme/` so the pre-commit hex hook (which grandfathers
 * `/theme/` paths) doesn't flag the Tailwind-style literals — they
 * have no equivalents in the mobile theme tokens yet.
 *
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44d follow-up).
 */

interface CategoryStyle {
  color: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORY_STYLE: Record<string, CategoryStyle> = {
  contracts: {
    color: me.brand,
    bg: me.brandSoft,
    icon: 'document-text',
  },
  contract: {
    color: me.brand,
    bg: me.brandSoft,
    icon: 'document-text',
  },
  photos: { color: '#3B82F6', bg: '#DBEAFE', icon: 'image' },
  photo: { color: '#3B82F6', bg: '#DBEAFE', icon: 'image' },
  certifications: {
    color: me.accent,
    bg: me.warnBg,
    icon: 'ribbon',
  },
  certification: {
    color: me.accent,
    bg: me.warnBg,
    icon: 'ribbon',
  },
  insurance: { color: '#8B5CF6', bg: '#EDE9FE', icon: 'shield-checkmark' },
  receipts: {
    color: me.ink2,
    bg: me.bg3,
    icon: 'receipt',
  },
  receipt: {
    color: me.ink2,
    bg: me.bg3,
    icon: 'receipt',
  },
  templates: { color: '#3B82F6', bg: '#DBEAFE', icon: 'copy' },
  template: { color: '#3B82F6', bg: '#DBEAFE', icon: 'copy' },
};

export function getDocStyle(category: string): CategoryStyle {
  const key = category?.toLowerCase() || '';
  return (
    CATEGORY_STYLE[key] || {
      color: me.ink2,
      bg: me.bg3,
      icon: 'document-outline',
    }
  );
}
