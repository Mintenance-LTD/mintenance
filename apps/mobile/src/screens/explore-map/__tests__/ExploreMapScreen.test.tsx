import React from 'react';
import { render } from '@testing-library/react-native';

// The screen requires react-native-maps and heavy native dependencies,
// so we only verify the module exports correctly.
describe('ExploreMapScreen', () => {
  it('should export the screen component', () => {
    // Dynamic require to avoid crash from native map module in test env
    const mod = require('../ExploreMapScreen');
    expect(mod.ExploreMapScreen).toBeDefined();
    expect(typeof mod.ExploreMapScreen).toBe('function');
  });
});
