import type { Metadata } from 'next';
import { TaxInfoForm } from './TaxInfoForm';

export const metadata: Metadata = {
  title: 'Tax Information | Mintenance',
  description:
    'Submit your tax details for HMRC reporting. Required for UK-based contractors.',
};

export default function TaxInfoPage() {
  return <TaxInfoForm />;
}
