import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Invoice Details | Mintenance',
  description: 'View invoice details, line items, payment status, and download or print your invoice.',
};

export default function InvoiceDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
