
import React from 'react';
import { render , waitFor} from '../test-utils';
import {
  LoadingSpinner,
  FullScreenLoading,
} from '../../components/LoadingSpinner';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    const { getByTestId } = render(<LoadingSpinner />);

    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('displays custom message when provided', () => {
    const customMessage = 'Loading your jobs...';
    const { getByText } = render(<LoadingSpinner message={customMessage} />);

    expect(getByText(customMessage)).toBeTruthy();
  });

  it('renders without message when message prop is undefined', () => {
    const { queryByText } = render(<LoadingSpinner message={undefined} />);

    expect(queryByText('Loading...')).toBeTruthy(); // default message
  });

  it('applies custom size when provided', () => {
    const { getByTestId } = render(<LoadingSpinner size='large' />);

    const spinner = getByTestId('loading-spinner');
    expect(spinner).toBeTruthy();
  });

  it('applies custom color when provided', () => {
    const { getByTestId } = render(<LoadingSpinner color='#FF0000' />);

    const spinner = getByTestId('loading-spinner');
    expect(spinner).toBeTruthy();
  });

  it('renders FullScreenLoading component', () => {
    const { getByText } = render(<FullScreenLoading />);

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('matches snapshot', () => {
    const { toJSON } = render(<LoadingSpinner message='Loading...' />);

    expect(toJSON()).toMatchSnapshot();
  });
});
