const user = { id: 'visual-test', role: 'homeowner' };
export const useCurrentUser = () => ({ user, loading: false });
export const useRealtime = () => ({ status: 'connected', isConnected: true });
export const useNotificationCounts = () => ({
  counts: { messages: 1, connections: 0, quoteRequests: 0, bids: 0 },
  loading: false,
});
