module.exports = {
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  SafeAreaConsumer: ({ children }) => children({}),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  initialWindowMetrics: {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    frame: { x: 0, y: 0, width: 375, height: 812 },
  },
  withSafeAreaInsets: (Component) => Component,
};
