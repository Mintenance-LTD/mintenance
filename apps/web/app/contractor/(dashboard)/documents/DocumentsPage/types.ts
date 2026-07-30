export interface Document {
  id: string;
  name: string;
  file_type: string;
  category: string;
  size_bytes: number;
  storage_path: string;
  public_url: string | null;
  job_id: string | null;
  jobTitle: string | null;
  starred: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  is_contract?: boolean;
  contract_id?: string;
  contract_status?: string;
}

interface CategoryOption {
  value: string;
  label: string;
}

export interface CategoryWithCount extends CategoryOption {
  count: number;
}

export const CATEGORIES: CategoryOption[] = [
  { value: 'all', label: 'All Documents' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'photos', label: 'Photos' },
  { value: 'certifications', label: 'Certifications' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'receipts', label: 'Receipts' },
  { value: 'templates', label: 'Templates' },
  { value: 'other', label: 'Other' },
];

export const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};
