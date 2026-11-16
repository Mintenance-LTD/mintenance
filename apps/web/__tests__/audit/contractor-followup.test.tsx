import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ContractStartChoices } from '@/components/legal/ContractStartChoices';
import { CreateQuoteClient } from '@/app/contractor/(dashboard)/quotes/create/components/CreateQuoteClient';
import { cleanAddress } from '@/lib/utils/location';
import { expenseCsvCell, isTestExpense } from '@/lib/contractor/expense-export';
import { workStartRestriction } from '@/lib/services/contracts/work-start';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'X-CSRF-Token': 'test' }),
}));
const response = (data: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => data,
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const contract = {
  id: 'c',
  status: 'accepted',
  cancellation_deadline: '2026-11-29T00:00:00Z',
  start_date: '2026-11-16',
  updated_at: '2026-11-15T12:00:00Z',
  review_token: 'a'.repeat(32),
};

it('shows the deadline and requires unchecked express consent before recording a separate request', async () => {
  mocks.fetch.mockResolvedValue(
    response({ records: [], earlyStartEligible: true })
  );
  render(<ContractStartChoices contract={contract} homeowner />);
  await screen.findByText(/scheduled start is before/);
  expect(screen.getByText(/29 November 2026/)).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Review early-start request' })
  );
  const save = screen.getByRole('button', {
    name: 'Record my early-start request',
  });
  expect(save).toBeDisabled();
  const choices = screen.getAllByRole('checkbox');
  choices.forEach((choice) => expect(choice).not.toBeChecked());
  fireEvent.click(choices[0]);
  fireEvent.click(choices[1]);
  expect(save).toBeEnabled();
  fireEvent.click(save);
  await screen.findByText(/homeowner has expressly requested/);
  const [, options] = mocks.fetch.mock.calls.find(([url]) =>
    url.endsWith('/early-start')
  )!;
  expect(options.headers['X-CSRF-Token']).toBe('test');
  expect(JSON.parse(options.body).legalConsent).toMatchObject({
    earlyStartRequested: true,
    fullPerformanceAcknowledged: false,
    expectedReviewToken: contract.review_token,
  });
});
it('gives contractors a visible deadline and homeowner next step without a consent control', async () => {
  mocks.fetch.mockResolvedValue(
    response({ records: [], earlyStartEligible: true })
  );
  render(<ContractStartChoices contract={contract} homeowner={false} />);
  await screen.findByText(/homeowner can review early-start choices/);
  expect(
    screen.queryByRole('button', { name: /early-start/ })
  ).not.toBeInTheDocument();
});
it('fails closed when start choices cannot be loaded', async () => {
  mocks.fetch.mockResolvedValue(response({}, 500));
  render(<ContractStartChoices contract={contract} homeowner />);
  await screen.findByRole('alert');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('retains the work-start cancellation guard and displays the UK deadline', () => {
  expect(
    workStartRestriction(contract, false, Date.parse('2026-11-16'))
  ).toContain('29 November 2026');
  expect(
    workStartRestriction(contract, true, Date.parse('2026-11-16'))
  ).toBeNull();
  expect(
    workStartRestriction(
      { ...contract, cancellation_requested_at: '2026-11-16' },
      true
    )
  ).toContain('support review');
});
it('removes repeated address segments without removing house or unit details', () => {
  expect(
    cleanAddress(
      '1 Peveril Close, Stafford, ST16 1YS, GB, Stafford, ST161YS, GB'
    )
  ).toBe('1 Peveril Close, Stafford, ST16 1YS, GB');
  expect(cleanAddress('Flat 2, 2 High Street, London')).toBe(
    'Flat 2, 2 High Street, London'
  );
});
it('identifies explicitly labelled test expenses and safely escapes accounting CSV', () => {
  expect(
    isTestExpense({ description: 'TEST ONLY - QA 1p - NOT REAL EXPENSE' })
  ).toBe(true);
  expect(isTestExpense({ description: 'Electrical test equipment' })).toBe(
    false
  );
  expect(expenseCsvCell('a,"b"')).toBe('"a,""b"""');
  expect(expenseCsvCell('=HYPERLINK("test")')).toBe('"\'=HYPERLINK(""test"")"');
});
it('saves a complete draft using the API field names, validity date and CSRF header without sending it', async () => {
  mocks.fetch.mockImplementation(async (url: string) =>
    response(
      url.includes('tax-info')
        ? { data: { vatRegistered: false } }
        : { quote: { id: 'new-draft' } }
    )
  );
  render(<CreateQuoteClient />);
  fireEvent.change(
    screen.getByPlaceholderText('Kitchen renovation for the Smith family'),
    { target: { value: 'QA repair' } }
  );
  fireEvent.change(screen.getByPlaceholderText('Alex Smith'), {
    target: { value: 'QA client' },
  });
  fireEvent.change(screen.getByPlaceholderText('alex@example.com'), {
    target: { value: 'qa@example.test' },
  });
  fireEvent.change(
    screen.getByPlaceholderText('e.g., Fitted cabinets and installation'),
    { target: { value: 'Repair' } }
  );
  const amount = screen
    .getAllByRole('spinbutton')
    .find((input) => (input as HTMLInputElement).value === '0')!;
  fireEvent.change(amount, { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await screen.findByText(/Quote saved as draft/);
  const calls = mocks.fetch.mock.calls.filter(
    ([url]) => url === '/api/contractor/quotes'
  );
  expect(calls).toHaveLength(1);
  const payload = JSON.parse(calls[0][1].body);
  expect(payload).toMatchObject({
    title: 'QA repair',
    totalAmount: 2,
    lineItems: [{ description: 'Repair', quantity: 1, unitPrice: 2 }],
  });
  expect(payload.validUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(calls[0][1].headers['X-CSRF-Token']).toBe('test');
  expect(
    mocks.fetch.mock.calls.some(([url]) => url.includes('send-quote'))
  ).toBe(false);
});
