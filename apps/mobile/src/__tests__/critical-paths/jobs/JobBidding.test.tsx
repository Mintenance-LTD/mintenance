import React from 'react';
import { render, fireEvent, waitFor, act } from '../../test-utils';
import { JobService } from '../../../services/JobService';
import BidSubmissionScreen from '../../../screens/BidSubmissionScreen';

// The real DatePicker renders the native @react-native-community
// datetimepicker only after a press toggles internal `show` state, which
// can't be driven deterministically in the unit env. Stub it with a
// pressable that fires `onChange` with a fixed future date so the bid
// form's required `proposedStartDate` gate can be satisfied in tests.
const FIXED_START_DATE = new Date('2026-07-01T00:00:00.000Z');
jest.mock('../../../components/ui/DatePicker', () => {
  const ReactLib = require('react');
  const RN = require('react-native');
  return {
    DatePicker: ({ onChange }: { onChange: (d: Date) => void }) =>
      ReactLib.createElement(
        RN.TouchableOpacity,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'Select start date',
          onPress: () => onChange(new Date('2026-07-01T00:00:00.000Z')),
        },
        ReactLib.createElement(RN.Text, null, 'Select date')
      ),
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// JobService methods are static class fields; submitBid is the create path
// used by the new-bid flow. Provide an explicit factory with the real names.
jest.mock('../../../services/JobService', () => ({
  JobService: {
    getJobById: jest.fn(),
    submitBid: jest.fn(),
    getBidsByJob: jest.fn(),
  },
}));

// Edit-mode hydration reads BidService.getMyBidForJob — not exercised in the
// new-bid flow under test, but mock it so the module import is satisfied.
jest.mock('../../../services/BidService', () => ({
  BidService: {
    getMyBidForJob: jest.fn(() => Promise.resolve(null)),
    submitBid: jest.fn(),
    updateBid: jest.fn(),
  },
}));

// featureAccess drives the U5 monthly bid-limit pre-check. Default to
// unlimited so the limit gate never blocks the submit button in tests.
jest.mock('../../../utils/featureAccess', () => ({
  featureAccess: {
    initialize: jest.fn(() => Promise.resolve()),
    getRemainingUsage: jest.fn(() => 'unlimited'),
    getFeature: jest.fn(() => null),
  },
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'contractor_1', role: 'contractor' },
  }),
}));

// A proposal description meeting the 50-char minimum the screen enforces.
const VALID_DESCRIPTION =
  'I can fix this leaky faucet today using a new cartridge and full reseal.';

describe('Job Bidding - Critical Path', () => {
  const mockJob = {
    id: 'job_123',
    title: 'Plumbing Repair',
    description: 'Fix leaky faucet',
    budget: 500,
    status: 'posted',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (JobService.getJobById as jest.Mock).mockResolvedValue(mockJob);
    (JobService.submitBid as jest.Mock).mockResolvedValue({ id: 'bid_123' });
  });

  const fillValidForm = async (
    getByPlaceholderText: (m: RegExp) => unknown,
    getByLabelText: (m: RegExp) => unknown,
    amount: string
  ) => {
    fireEvent.changeText(getByPlaceholderText(/e\.g\. 250/i) as never, amount);
    fireEvent.changeText(
      getByPlaceholderText(/describe your approach/i) as never,
      VALID_DESCRIPTION
    );
    fireEvent.changeText(getByPlaceholderText(/e\.g\. 3/i) as never, '3');
    // Stubbed DatePicker fires onChange with the fixed future date.
    await act(async () => {
      fireEvent.press(getByLabelText(/select start date/i) as never);
    });
  };

  it('should submit bid for job', async () => {
    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <BidSubmissionScreen
        navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never}
        route={{ params: { jobId: 'job_123' } } as never}
      />
    );

    await waitFor(() => {
      expect(getByText(/plumbing repair/i)).toBeTruthy();
    });

    await fillValidForm(getByPlaceholderText, getByLabelText, '450');

    await act(async () => {
      fireEvent.press(getByLabelText(/^submit bid$/i));
    });

    await waitFor(() => {
      expect(JobService.submitBid).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job_123',
          contractorId: 'contractor_1',
          amount: 450,
          description: VALID_DESCRIPTION,
          estimatedDurationDays: 3,
          proposedStartDate: '2026-07-01',
        })
      );
    });
  });

  it('should block submission for an invalid bid amount', async () => {
    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <BidSubmissionScreen
        navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never}
        route={{ params: { jobId: 'job_123' } } as never}
      />
    );

    await waitFor(() => {
      expect(getByText(/plumbing repair/i)).toBeTruthy();
    });

    // Fill everything else validly but leave the amount at 0 — the screen
    // disables the submit CTA (isValid requires bidAmount > 0), so the
    // create endpoint must never be reached.
    await fillValidForm(getByPlaceholderText, getByLabelText, '0');

    const submitBtn = getByLabelText(/^submit bid$/i);
    expect(submitBtn.props.accessibilityState?.disabled).toBe(true);

    await act(async () => {
      fireEvent.press(submitBtn);
    });

    expect(JobService.submitBid).not.toHaveBeenCalled();
  });

  it('should surface a duplicate-bid error from the server', async () => {
    (JobService.submitBid as jest.Mock).mockRejectedValue(
      new Error('You have already bid on this job')
    );

    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <BidSubmissionScreen
        navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never}
        route={{ params: { jobId: 'job_123' } } as never}
      />
    );

    await waitFor(() => {
      expect(getByText(/plumbing repair/i)).toBeTruthy();
    });

    await fillValidForm(getByPlaceholderText, getByLabelText, '450');

    await act(async () => {
      fireEvent.press(getByLabelText(/^submit bid$/i));
    });

    // The screen renders the rejection message inline via the formError
    // banner (not an Alert).
    await waitFor(() => {
      expect(getByText(/you have already bid on this job/i)).toBeTruthy();
    });
    expect(JobService.submitBid).toHaveBeenCalled();
  });
});
