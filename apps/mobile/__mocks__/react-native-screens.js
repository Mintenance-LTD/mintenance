const React = require('react');

const View = ({ children, ...props }) => React.createElement('View', props, children);

module.exports = {
  enableScreens: jest.fn(),
  disableScreens: jest.fn(),
  screensEnabled: jest.fn(() => false),
  Screen: View,
  ScreenContainer: View,
  NativeScreen: View,
  NativeScreenContainer: View,
  ScreenStack: View,
  ScreenStackHeaderConfig: View,
  ScreenStackHeaderBackButtonImage: View,
  ScreenStackHeaderCenterView: View,
  ScreenStackHeaderLeftView: View,
  ScreenStackHeaderRightView: View,
  ScreenStackHeaderSearchBarView: View,
  SearchBar: View,
};
