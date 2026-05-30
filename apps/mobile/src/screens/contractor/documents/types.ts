import type { Ionicons } from '@expo/vector-icons';

/**
 * Shared types + constants for the contractor Documents screen.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44d) when the screen was
 * split from a 670-line monolith.
 */

export interface Document {
  id: string;
  filename: string;
  category: string;
  uploaded_at: string;
  starred: boolean;
  file_size?: number;
  public_url?: string;
  is_contract?: boolean;
  job_id?: string;
  /**
   * ISO-8601 expiry timestamp for time-bound documents (currently only
   * contractor certifications + insurance). Populated by
   * `useDocumentsQuery` from `contractor_certifications.expiry_date`.
   * Drives the expiring-soon banner on the Documents screen — see
   * `ExpiringBanner` for the windowing logic.
   */
  expires_at?: string;
}

export type DocFilter =
  | 'all'
  | 'contracts'
  | 'photos'
  | 'certifications'
  | 'insurance'
  | 'receipts'
  | 'templates';

export const FILTER_CONFIG: {
  key: DocFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'contracts', label: 'Contracts', icon: 'document-text-outline' },
  { key: 'photos', label: 'Photos', icon: 'image-outline' },
  { key: 'certifications', label: 'Certs', icon: 'ribbon-outline' },
  { key: 'insurance', label: 'Insurance', icon: 'shield-checkmark-outline' },
  { key: 'receipts', label: 'Receipts', icon: 'receipt-outline' },
  { key: 'templates', label: 'Templates', icon: 'copy-outline' },
];

// CATEGORY_STYLE + getDocStyle moved to theme/categoryStyles.ts so
// the pre-commit hex hook (which grandfathers `/theme/` paths) doesn't
// flag the Tailwind literals. Re-exported for callers that import
// `getDocStyle` from this module.
export { getDocStyle } from './theme/categoryStyles';

export const EMPTY_MESSAGES: Record<
  DocFilter,
  { title: string; desc: string }
> = {
  all: {
    title: 'No Documents Yet',
    desc: 'Upload contracts, photos, certificates and more to keep everything organised.',
  },
  contracts: {
    title: 'No Contracts',
    desc: 'Signed contracts with your clients will appear here.',
  },
  photos: {
    title: 'No Photos',
    desc: 'Job photos and site images will be stored here.',
  },
  certifications: {
    title: 'No Certificates',
    desc: 'Upload your trade certifications to build trust with homeowners.',
  },
  insurance: {
    title: 'No Insurance Docs',
    desc: 'Add your liability and professional insurance documents.',
  },
  receipts: {
    title: 'No Receipts',
    desc: 'Material and expense receipts will appear here.',
  },
  templates: {
    title: 'No Templates',
    desc: 'Save quote and contract templates for quick reuse.',
  },
};

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileTypeIcon(
  filename: string
): keyof typeof Ionicons.glyphMap {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext))
    return 'image';
  if (ext === 'pdf') return 'document-text';
  if (['doc', 'docx'].includes(ext)) return 'document';
  if (['xls', 'xlsx'].includes(ext)) return 'grid';
  return 'document-outline';
}

/**
 * Short 2-3-letter extension label rendered on the DocIcon chip. The
 * web spec uses "PDF" / "JPG" / "DOC" / "XLS"; we normalise long extensions
 * (jpeg → JPG, docx → DOC, xlsx → XLS) and fall back to "FILE" for
 * extensions we don't recognise.
 */
export function getFileExtLabel(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (!ext || ext === filename.toLowerCase()) return 'FILE';
  if (['jpg', 'jpeg'].includes(ext)) return 'JPG';
  if (['doc', 'docx'].includes(ext)) return 'DOC';
  if (['xls', 'xlsx'].includes(ext)) return 'XLS';
  if (['ppt', 'pptx'].includes(ext)) return 'PPT';
  return ext.slice(0, 4).toUpperCase();
}
