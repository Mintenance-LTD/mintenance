import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test: Dropdown | Mintenance',
  description: 'Test page for verifying the profile dropdown component behavior.',
};

export default function TestDropdownLayout({ children }: { children: React.ReactNode }) {
  return children;
}
