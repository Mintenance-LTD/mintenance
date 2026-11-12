import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MintEditorialPropertySystemsTable } from '@/app/properties/[id]/components/MintEditorialPropertySystemsTable';
import { formatGBP } from '@/app/jobs/[id]/components/mint-editorial/MintEditorialJobCards';

it('does not infer a service date or condition from a completed job creation date', () => {
  render(<MintEditorialPropertySystemsTable propertyId="property" jobs={[{ id:'job', title:'Repair wiring', status:'completed', contractor:null, amount:1.5, date:'2026-01-01T12:00:00Z', category:'electrical' }]} />);
  expect(screen.getByText(/Service date and system condition not recorded/)).toBeTruthy();
  expect(screen.queryByText(/Last serviced/)).toBeNull();
  expect(screen.queryByText('OK', {exact:true})).toBeNull();
});
it.each([[1.5,'£1.50'],[1.46,'£1.46'],[1200.05,'£1,200.05']])('preserves contractual pence for %s', (amount, display) => {
  expect(formatGBP(amount)).toBe(display);
});
