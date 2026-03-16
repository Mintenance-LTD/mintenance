// Mock for MutualConnectionsService
export const MutualConnectionsService = {
  // Add mock methods as needed
  initialize: jest.fn(() => Promise.resolve()),
  getData: jest.fn(() => Promise.resolve([])),
  updateData: jest.fn(() => Promise.resolve({ success: true })),
};

export default MutualConnectionsService;
