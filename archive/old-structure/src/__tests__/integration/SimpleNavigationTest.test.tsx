import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

// Simple test to verify React Testing Library is working
const TestComponent = () => (
  <View>
    <Text>Hello Test</Text>
  </View>
);

describe('Simple Navigation Test', () => {
  it('should render basic component', () => {
    const { getByText } = render(<TestComponent />);
    expect(getByText('Hello Test')).toBeTruthy();
  });
});
