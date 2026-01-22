// Mock for BiometricService
export const BiometricService = {
  // Add mock methods as needed
  initialize: jest.fn(() => Promise.resolve()),
  getData: jest.fn(() => Promise.resolve([])),
  updateData: jest.fn(() => Promise.resolve({ success: true })),
};

export default BiometricService;
