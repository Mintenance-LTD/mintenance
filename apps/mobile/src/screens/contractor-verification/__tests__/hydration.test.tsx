import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { ContractorVerificationScreen } from '../ContractorVerificationScreen';
import { mobileApiClient } from '../../../utils/mobileApiClient';

let mockUser: { id: string } | null = { id: 'contractor-a' };
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, refreshUser: jest.fn() }),
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const profile = (company: string, status = 'verified') => ({
  profile: { company_name: company, verification_status: status },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'contractor-a' };
});

it('hydrates when authentication becomes available and clears on logout', async () => {
  mockUser = null;
  jest.mocked(mobileApiClient.get).mockResolvedValue(profile('Company A'));
  const screen = render(<ContractorVerificationScreen navigation={navigation} />);
  expect(mobileApiClient.get).not.toHaveBeenCalled();
  mockUser = { id: 'contractor-a' };
  screen.rerender(<ContractorVerificationScreen navigation={navigation} />);
  await waitFor(() => expect(screen.getByDisplayValue('Company A')).toBeTruthy());
  mockUser = null;
  screen.rerender(<ContractorVerificationScreen navigation={navigation} />);
  expect(screen.queryByDisplayValue('Company A')).toBeNull();
  expect(screen.queryByText(/Verified — edits/)).toBeNull();
});

it('ignores a previous account response arriving after switching accounts', async () => {
  let finishOld!: (value: ReturnType<typeof profile>) => void;
  jest.mocked(mobileApiClient.get)
    .mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockResolvedValueOnce(profile('Company B', 'pending'));
  const screen = render(<ContractorVerificationScreen navigation={navigation} />);
  mockUser = { id: 'contractor-b' };
  screen.rerender(<ContractorVerificationScreen navigation={navigation} />);
  await waitFor(() => expect(screen.getByDisplayValue('Company B')).toBeTruthy());
  await act(async () => { finishOld(profile('Company A')); });
  expect(screen.getByDisplayValue('Company B')).toBeTruthy();
  expect(screen.queryByDisplayValue('Company A')).toBeNull();
  expect(screen.queryByText(/Verified — edits/)).toBeNull();
});
