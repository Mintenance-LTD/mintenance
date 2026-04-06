// WebRTC configuration for optimal performance
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add TURN servers for production
  // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
];
