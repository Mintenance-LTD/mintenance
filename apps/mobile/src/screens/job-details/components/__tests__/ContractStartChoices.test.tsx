import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  CUSTOMER_TERMS_VERSION,
  EARLY_START_REQUEST,
} from '@mintenance/shared';
import { mobileApiClient } from '../../../../utils/mobileApiClient';
import type { Contract } from '../../contract-view/contractViewModel';
import { ContractStartChoices } from '../ContractStartChoices';

jest.mock('../../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('../../../../components/CustomerTerms', () => ({
  CustomerTerms: () => null,
}));

const contract: Contract = {
  id: 'contract-1',
  job_id: 'job-1',
  homeowner_id: 'customer-1',
  contractor_id: 'contractor-1',
  status: 'accepted',
  title: 'Repair',
  description: null,
  amount: 150,
  start_date: '2099-06-02T08:00:00Z',
  end_date: null,
  contractor_signed_at: '2099-06-01',
  homeowner_signed_at: '2099-06-01',
  terms: {},
  created_at: '2099-06-01',
  updated_at: '2099-06-01T10:00:00Z',
  review_token: 'reviewed-snapshot',
  cancellation_deadline: '2099-06-15T14:00:00Z',
  contractorName: 'Contractor',
  homeownerName: 'Customer',
};
const get = jest.mocked(mobileApiClient.get);
const post = jest.mocked(mobileApiClient.post);
const receipt = { earlyStartEligible: true, records: [], agreement: {} };
beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue(receipt);
  post.mockResolvedValue({ request: {} });
});
const terms =
  'I have reviewed the customer terms and my existing job agreement for this early-start request.';

it('requires explicit choices and sends the reviewed agreement revision', async () => {
  const onSaved = jest.fn();
  const ui = render(
    <ContractStartChoices contract={contract} homeowner onSaved={onSaved} />
  );
  fireEvent.press(await ui.findByText('Review early-start request'));
  expect(ui.getByText(/15:00 UK time/)).toBeTruthy();
  expect(ui.getByText(/scheduled start is before this deadline/)).toBeTruthy();
  const submit = ui.getByLabelText('Record my early-start request');
  fireEvent.press(submit);
  expect(post).not.toHaveBeenCalled();
  fireEvent.press(ui.getByLabelText(terms));
  fireEvent.press(submit);
  expect(post).not.toHaveBeenCalled();
  fireEvent.press(ui.getByLabelText(EARLY_START_REQUEST));
  fireEvent.press(submit);
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(post).toHaveBeenCalledWith('/api/contracts/contract-1/early-start', {
    legalConsent: {
      termsAccepted: true,
      earlyStartRequested: true,
      fullPerformanceAcknowledged: false,
      termsVersion: CUSTOMER_TERMS_VERSION,
      expectedUpdatedAt: contract.updated_at,
      expectedReviewToken: contract.review_token,
    },
  });
  expect(ui.getByText(/homeowner has expressly requested/)).toBeTruthy();
});

it('explains the restriction to contractors without offering customer consent', async () => {
  const ui = render(
    <ContractStartChoices
      contract={contract}
      homeowner={false}
      onSaved={jest.fn()}
    />
  );
  expect(
    await ui.findByText(/homeowner can review early-start choices/)
  ).toBeTruthy();
  expect(ui.queryByText('Review early-start request')).toBeNull();
  expect(post).not.toHaveBeenCalled();
});

it.each([
  { ...receipt, earlyStartRequest: { requested_at: '2099-06-01' } },
  {
    ...receipt,
    records: [{ signer_role: 'homeowner', early_start_requested: true }],
  },
])('shows existing consent without allowing another request', async (data) => {
  get.mockResolvedValue(data);
  const ui = render(
    <ContractStartChoices contract={contract} homeowner onSaved={jest.fn()} />
  );
  expect(await ui.findByText(/homeowner has expressly requested/)).toBeTruthy();
  expect(ui.queryByText('Review early-start request')).toBeNull();
});

it.each([
  { ...receipt, earlyStartEligible: false },
  { ...receipt, agreement: { cancellation_requested_at: '2099-06-01' } },
])(
  'does not offer requests for ineligible or cancelled agreements',
  async (data) => {
    get.mockResolvedValue(data);
    const ui = render(
      <ContractStartChoices contract={contract} homeowner onSaved={jest.fn()} />
    );
    expect(
      await ui.findByText(/Review the job’s current requirements/)
    ).toBeTruthy();
    expect(ui.queryByText('Review early-start request')).toBeNull();
  }
);

it('fails closed on receipt errors and provides retry', async () => {
  get.mockRejectedValueOnce(new Error('offline'));
  const ui = render(
    <ContractStartChoices contract={contract} homeowner onSaved={jest.fn()} />
  );
  fireEvent.press(await ui.findByText('Retry start choices'));
  expect(await ui.findByText('Review early-start request')).toBeTruthy();
  expect(get).toHaveBeenCalledTimes(2);
});

it('keeps a rejected stale-agreement request visible as an error', async () => {
  post.mockRejectedValue(
    new Error('The agreement changed. Reload and review it again.')
  );
  const onSaved = jest.fn();
  const ui = render(
    <ContractStartChoices contract={contract} homeowner onSaved={onSaved} />
  );
  fireEvent.press(await ui.findByText('Review early-start request'));
  fireEvent.press(ui.getByLabelText(terms));
  fireEvent.press(ui.getByLabelText(EARLY_START_REQUEST));
  fireEvent.press(ui.getByText('Record my early-start request'));
  expect(await ui.findByText(/agreement changed/)).toBeTruthy();
  expect(onSaved).not.toHaveBeenCalled();
});

it('prevents duplicate submissions and ignores completion after unmount', async () => {
  let finish!: (value: unknown) => void;
  post.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const onSaved = jest.fn();
  const ui = render(
    <ContractStartChoices contract={contract} homeowner onSaved={onSaved} />
  );
  fireEvent.press(await ui.findByText('Review early-start request'));
  fireEvent.press(ui.getByLabelText(terms));
  fireEvent.press(ui.getByLabelText(EARLY_START_REQUEST));
  const button = ui.getByLabelText('Record my early-start request');
  fireEvent.press(button);
  fireEvent.press(button);
  expect(post).toHaveBeenCalledTimes(1);
  ui.unmount();
  await act(async () => {
    finish({ request: {} });
  });
  expect(onSaved).not.toHaveBeenCalled();
});

it('does not fetch choices for unsigned or legacy agreements', () => {
  const ui = render(
    <ContractStartChoices
      contract={{ ...contract, cancellation_deadline: null }}
      homeowner
      onSaved={jest.fn()}
    />
  );
  expect(ui.toJSON()).toBeNull();
  expect(get).not.toHaveBeenCalled();
});
