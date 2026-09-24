import React from 'react';
import { render, screen } from '@testing-library/react';
import { DocumentCard } from '../DocumentCard';
import type { DocumentItem } from '../DocumentRow';

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.ComponentProps<'a'>) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock('@/components/documents/DocIcon', () => ({
  DocIcon: ({ ext }: { ext: string }) => <span>{ext}</span>,
}));

const contract: DocumentItem = {
  id: 'contract-00000000-0000-4000-8000-000000000001',
  contract_id: '00000000-0000-4000-8000-000000000001',
  type: 'contract',
  name: 'Synthetic contract',
  status: 'pending_homeowner',
  amount: 10,
  job_id: 'synthetic-job',
  href: '/jobs/synthetic-job',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('document actions', () => {
  it('keeps record navigation separate from an actual PDF endpoint', () => {
    const { container } = render(<DocumentCard doc={contract} />);
    expect(screen.getByRole('link', { name: 'Download PDF' })).toHaveAttribute(
      'href',
      `/api/contracts/${contract.contract_id}/pdf`
    );
    expect(screen.getByRole('link', { name: /Review & sign/ })).toHaveAttribute(
      'href',
      contract.href
    );
    expect(container.querySelector('a a')).toBeNull();
    expect(screen.queryByText('Remind me later')).toBeNull();
  });
  it('does not label a payment record as a downloadable PDF', () => {
    render(
      <DocumentCard
        doc={{
          ...contract,
          type: 'payment',
          href: '/payments',
          status: 'held',
        }}
      />
    );
    expect(screen.queryByRole('link', { name: 'Download PDF' })).toBeNull();
    expect(screen.queryByText('PDF')).toBeNull();
    expect(screen.getByRole('link', { name: 'View record' })).toHaveAttribute(
      'href',
      '/payments'
    );
  });
});
