const React = require('react');
const { View } = require('react-native');

const makeSvgMock = () => ({ children, ...props }) =>
  React.createElement(View, props, children);

const Svg = makeSvgMock();
const Rect = makeSvgMock();
const Circle = makeSvgMock();
const Ellipse = makeSvgMock();
const Line = makeSvgMock();
const Polyline = makeSvgMock();
const Polygon = makeSvgMock();
const Path = makeSvgMock();
const Text = makeSvgMock();
const TSpan = makeSvgMock();
const TextPath = makeSvgMock();
const G = makeSvgMock();
const Use = makeSvgMock();
const Symbol = makeSvgMock();
const Defs = makeSvgMock();
const Mask = makeSvgMock();
const ClipPath = makeSvgMock();
const LinearGradient = makeSvgMock();
const RadialGradient = makeSvgMock();
const Stop = makeSvgMock();
const Pattern = makeSvgMock();
const Image = makeSvgMock();
const ForeignObject = makeSvgMock();
const Marker = makeSvgMock();

module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  Rect,
  Circle,
  Ellipse,
  Line,
  Polyline,
  Polygon,
  Path,
  Text,
  TSpan,
  TextPath,
  G,
  Use,
  Symbol,
  Defs,
  Mask,
  ClipPath,
  LinearGradient,
  RadialGradient,
  Stop,
  Pattern,
  Image,
  ForeignObject,
  Marker,
};
