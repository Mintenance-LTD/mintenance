import type { ConnectionStatus } from '@mintenance/types';

export interface ConnectionRequest {
  id: string;
  requesterId: string;
  targetUserId: string;
  createdAt: string;
}

export class MutualConnectionsService {
  static async getConnectionStatus(): Promise<ConnectionStatus | null> {
    return null;
  }

  static async sendConnectionRequest(): Promise<void> {
    return undefined;
  }

  static async getConnectionRequests(): Promise<ConnectionRequest[]> {
    return [];
  }

  static async rejectConnectionRequest(): Promise<void> {
    return undefined;
  }
}

export default MutualConnectionsService;
