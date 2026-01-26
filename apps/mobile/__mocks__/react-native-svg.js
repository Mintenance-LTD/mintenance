const React = require('react');
const { View } = require('react-native');

const Svg = ({ children, ...props }) => React.createElement(View, props, children);
const Rect = ({ children, ...props }) => React.createElement(View, props, children);
const Defs = ({ children, ...props }) => React.createElement(View, props, children);
const Mask = ({ children, ...props }) => React.createElement(View, props, children);

module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  Rect,
  Defs,
  Mask,
};

