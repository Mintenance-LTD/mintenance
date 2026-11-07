import React from 'react';
import { render } from '@testing-library/react-native';
import { PaymentCard } from '../components/PaymentHistoryCard';
import { BudgetOverview } from '../../financials/FinancialsScreen/BudgetOverview';
import { JobsEmptyState } from '../../jobs/JobsEmptyState';
import { CONTRACTOR_TABS } from '../../jobs/types';
import { displayAddress } from '../../../utils/displayAddress';
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
it('does not promise a bank arrival date based on the original payment date', () => {
  const view = render(
    <PaymentCard
      payment={{
        id: 'p',
        jobId: 'j',
        jobTitle: 'Test repair',
        amount: 20,
        status: 'refunded',
        createdAt: '2026-01-01',
      }}
    />
  );
  expect(
    view.getByText('Refund recorded. Bank arrival date is not available here.')
  ).toBeTruthy();
  expect(view.queryByText(/Expected by/)).toBeNull();
});
it('does not invent a budget from payment records', () => {
  const view = render(<BudgetOverview />);
  expect(view.getByText(/No spending budget is available here/)).toBeTruthy();
  expect(view.queryByText('You are on track!')).toBeNull();
});
it('names contractor filters for their actual status coverage', () => {
  expect(CONTRACTOR_TABS.find((tab) => tab.key === 'assigned')?.label).toBe(
    'Assigned'
  );
  expect(CONTRACTOR_TABS.find((tab) => tab.key === 'active')?.label).toBe(
    'Active'
  );
  const view = render(
    <JobsEmptyState
      isContractor
      selectedFilter='assigned'
      onClearSearch={jest.fn()}
      onSortModeChange={jest.fn()}
      onAddJob={jest.fn()}
    />
  );
  expect(
    view.getByText('Jobs appear here when a homeowner accepts your bid.')
  ).toBeTruthy();
  expect(view.queryByText('Post a Job')).toBeNull();
});
it('removes repeated address components without altering distinct unit/street details', () => {
  expect(
    displayAddress('Unit 2, 10 Example Road, Exampletown, GB, exampletown, GB')
  ).toBe('Unit 2, 10 Example Road, Exampletown, GB');
  expect(displayAddress('Flat 1, 1 Example Road')).toBe(
    'Flat 1, 1 Example Road'
  );
});
