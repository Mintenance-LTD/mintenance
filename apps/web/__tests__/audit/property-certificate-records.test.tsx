import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MintEditorialPropertyDocuments } from '@/app/properties/[id]/components/MintEditorialPropertyDocuments';
it('renders actual certificate metadata and supports issuer search without inventing files', () => {
  render(
    <MintEditorialPropertyDocuments
      certificates={[
        {
          id: 'cert',
          cert_type: 'gas_safety',
          certificate_number: 'TEST-123',
          issued_date: null,
          expiry_date: null,
          issuer_name: 'Synthetic Inspector',
        },
      ]}
    />
  );
  expect(screen.getByText('TEST-123')).toBeTruthy();
  expect(screen.queryByText('PDF')).toBeNull();
  expect(screen.queryByText('Auto-filed')).toBeNull();
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Search certificates' }),
    { target: { value: 'absent' } }
  );
  expect(screen.getByText('No certificates match your search.')).toBeTruthy();
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Search certificates' }),
    { target: { value: 'synthetic' } }
  );
  expect(screen.getByText('TEST-123')).toBeTruthy();
});
