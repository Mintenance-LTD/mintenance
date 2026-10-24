import React from 'react';
import { render } from '@testing-library/react-native';
import { FoundingMemberCard } from '../../../screens/subscription/components/FoundingMemberCard';
let mockScheme = 'light';
jest.mock('../../../design-system/theme', () => ({
  useTheme: () => ({ colorScheme: mockScheme }),
}));
it('shows homeowner benefits without contractor fees', () => {
  const view = render(
    <FoundingMemberCard role='homeowner' platformFeePercent='5%' />
  );
  expect(view.getByText(/Agency features/)).toBeTruthy();
  expect(view.queryByText(/platform fee|5%/)).toBeNull();
});
it('uses the current contractor fee in dark mode', () => {
  mockScheme = 'dark';
  const view = render(
    <FoundingMemberCard role='contractor' platformFeePercent='6.5%' />
  );
  expect(view.getByText(/Business features/)).toBeTruthy();
  expect(view.getByText(/6.5%/)).toBeTruthy();
  const title = view.getByText('Your early-user benefits are active');
  expect(title.props.style.color).toBe('#F5F5F5');
});
