import React from 'react';
import renderer from 'react-test-renderer';
import { Badge } from '../Badge';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('Badge', () => {
  it('renders with default props', () => {
    const instance = renderer.create(<Badge>Test</Badge>);
    expect(instance).toBeDefined();
  });
});
