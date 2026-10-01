import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CustomTabBar } from '../components/CustomTabBar';
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'homeowner' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon');

it.each([0, 1])(
  'Jobs tab pops its existing stack from tab index %s',
  (index) => {
    const dispatch = jest.fn();
    const navigate = jest.fn();
    const props = {
      state: {
        index,
        routes: [
          { key: 'home', name: 'HomeTab' },
          {
            key: 'jobs',
            name: 'JobsTab',
            state: {
              key: 'jobs-stack',
              index: 1,
              routes: [
                { name: 'JobsList', key: 'list' },
                { name: 'JobDetails', key: 'detail' },
              ],
            },
          },
        ],
      },
      descriptors: {
        home: { options: {} },
        jobs: { options: { tabBarAccessibilityLabel: 'Jobs tab' } },
      },
      navigation: {
        emit: () => ({ defaultPrevented: false }),
        dispatch,
        navigate,
      },
    } as unknown as BottomTabBarProps;
    const screen = render(<CustomTabBar {...props} />);
    fireEvent.press(screen.getByLabelText('Jobs tab'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'POP_TO',
      payload: { name: 'JobsList', params: undefined, merge: undefined },
      target: 'jobs-stack',
    });
    if (index === 0) expect(navigate).toHaveBeenCalledWith('JobsTab');
    else expect(navigate).not.toHaveBeenCalled();
  }
);
