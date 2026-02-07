
import React from 'react';
import { render } from '../../test-utils';
import { Input } from '../../../components/ui/Input/Input';
import { Button } from '../../../components/ui/Button/Button';
import { Checkbox } from '../../../components/ui/Checkbox/Checkbox';
import { Select } from '../../../components/ui/Select/Select';

jest.mock('react-native', () => require('../../__mocks__/react-native.js'));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('Form Components - Snapshots', () => {
  describe('Input', () => {
    it('should match snapshot for text input', () => {
      const { toJSON } = render(
        <Input
          label="Email"
          placeholder="Enter your email"
          value=""
          onChangeText={jest.fn()}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for password input', () => {
      const { toJSON } = render(
        <Input
          label="Password"
          placeholder="Enter your password"
          value=""
          onChangeText={jest.fn()}
          secureTextEntry
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with error', () => {
      const { toJSON } = render(
        <Input
          label="Email"
          value="invalid"
          error="Please enter a valid email"
          onChangeText={jest.fn()}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Button', () => {
    it('should match snapshot for primary button', () => {
      const { toJSON } = render(
        <Button title="Submit" onPress={jest.fn()} variant="primary" />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for disabled button', () => {
      const { toJSON } = render(
        <Button title="Submit" onPress={jest.fn()} disabled />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for loading button', () => {
      const { toJSON } = render(
        <Button title="Loading..." onPress={jest.fn()} loading />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Checkbox', () => {
    it('should match snapshot when unchecked', () => {
      const { toJSON } = render(
        <Checkbox label="Remember me" value={false} onValueChange={jest.fn()} />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot when checked', () => {
      const { toJSON } = render(
        <Checkbox label="I agree to terms" value={true} onValueChange={jest.fn()} />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Select', () => {
    it('should match snapshot', () => {
      const options = [
        { label: 'Plumbing', value: 'plumbing' },
        { label: 'Electrical', value: 'electrical' },
        { label: 'Painting', value: 'painting' },
      ];

      const { toJSON } = render(
        <Select
          label="Category"
          options={options}
          value=""
          onValueChange={jest.fn()}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
