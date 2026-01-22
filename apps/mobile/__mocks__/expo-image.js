const React = require('react');
const { Image: RNImage } = require('react-native');

const Image = React.forwardRef((props, ref) => {
  return React.createElement(RNImage, { ...props, ref });
});

module.exports = {
  __esModule: true,
  Image,
  ImageContentFit: {},
  ImageTransition: {},
  default: Image,
};

