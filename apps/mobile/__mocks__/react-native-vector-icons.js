module.exports = {
  createIconSet: jest.fn(() => {
    const Icon = () => null;
    Icon.loadFont = jest.fn();
    Icon.hasIcon = jest.fn(() => true);
    Icon.getImageSource = jest.fn(() => Promise.resolve({}));
    Icon.getImageSourceSync = jest.fn(() => ({}));
    return Icon;
  }),
  createIconSetFromFontello: jest.fn(),
  createIconSetFromIcoMoon: jest.fn(),
  createMultiStyleIconSet: jest.fn(),
};
