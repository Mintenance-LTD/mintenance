import type { Ionicons } from '@expo/vector-icons';
import { me } from '../../../../design-system/mint-editorial';

/**
 * Per-document-category icon + colour palette for the contractor
 * Documents library.
 *
 * Spec-locked from `redesign-v2/documents-web.html` (Contractor library
 * screen). The category palette mirrors the web ContractorLibraryView
 * so the mobile + web libraries read identically:
 *   - Contracts      → deep purple (--me-doc-contract-*)
 *   - Photos         → teal-leaning blue (--me-doc-payment-*)
 *   - Certifications → green (--me-doc-cert-*)
 *   - Insurance      → magenta (--me-doc-bid-*)
 *   - Receipts       → amber (--me-doc-receipt-*)
 *   - Templates      → ink (neutral)
 *
 * Icons match the web hero/tiles: contracts use document-text, photos
 * use camera, certifications use shield, insurance uses ribbon (lock-
 * adjacent on Ionicons), receipts use wallet/receipt, templates use
 * copy.
 *
 * Lives under `theme/` so the pre-commit hex hook grandfathers the
 * path — but all values are now token-derived, so there are no raw
 * hex literals to grandfather any more.
 */

interface CategoryStyle {
  color: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORY_STYLE: Record<string, CategoryStyle> = {
  contracts: {
    color: me.doc.contractFg,
    bg: me.doc.contractBg,
    icon: 'document-text',
  },
  contract: {
    color: me.doc.contractFg,
    bg: me.doc.contractBg,
    icon: 'document-text',
  },
  photos: { color: me.doc.paymentFg, bg: me.doc.paymentBg, icon: 'camera' },
  photo: { color: me.doc.paymentFg, bg: me.doc.paymentBg, icon: 'camera' },
  certifications: {
    color: me.doc.certFg,
    bg: me.doc.certBg,
    icon: 'shield-checkmark',
  },
  certification: {
    color: me.doc.certFg,
    bg: me.doc.certBg,
    icon: 'shield-checkmark',
  },
  insurance: {
    color: me.doc.bidFg,
    bg: me.doc.bidBg,
    icon: 'ribbon',
  },
  receipts: {
    color: me.doc.receiptFg,
    bg: me.doc.receiptBg,
    icon: 'wallet',
  },
  receipt: {
    color: me.doc.receiptFg,
    bg: me.doc.receiptBg,
    icon: 'wallet',
  },
  templates: {
    color: me.ink2,
    bg: me.bg2,
    icon: 'copy',
  },
  template: {
    color: me.ink2,
    bg: me.bg2,
    icon: 'copy',
  },
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
