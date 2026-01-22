module.exports = {
  addEventListener: jest.fn(() => ({ unsubscribe: jest.fn() })),
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: {
      isConnectionExpensive: false,
      cellularGeneration: null,
    },
  })),
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
};
