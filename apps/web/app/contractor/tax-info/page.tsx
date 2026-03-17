import type { Metadata } from 'next';
import { TaxInfoForm } from './TaxInfoForm';

export const metadata: Metadata = {
  title: 'Tax Information (W-9) | Mintenance',
  description: 'Submit your W-9 tax information for 1099-NEC reporting. Required for US-based contractors.',
};

export default function TaxInfoPage() {
  return <TaxInfoForm />;
}
