import { supabase } from '../config/supabase';
import { MutualConnection, ConnectionRequest, ConnectionStatus, User } from '../types';
import { logger } from '../utils/logger';

export class MutualConnectionsService {
  // ===== CONNECTION REQUESTS =====

  static async sendConnectionRequest(
    requesterId: string,
    receiverId: string,
    message?: string
  ): Promise<MutualConnection> {
    try {
      // Check if connection already exists
      const { data: existingConnection } = await supabase
        .from('mutual_connections')
        .select('*')
        .or(
          `and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${requesterId})`
        )
        .single();

      if (existingConnection) {
        throw new Error('Connection already exists or request already sent');
      }

      const { data, error } = await supabase
        .from('mutual_connections')
        .insert({
          requester_id: requesterId,
          receiver_id: receiverId,
          status: 'pending',
          message,
          requested_at: new Date().toISOString(),
        })
        .select(`
          *,
          requester:requester_id (
            id,
            first_name,
            last_name,
            email,
            role,
            profile_image_url,
            bio
          ),
          receiver:receiver_id (
            id,
            first_name,
            last_name,
            email,
            role,
            profile_image_url,
            bio
          )
        `)
        .single();

      if (error) throw error;

      return this.mapToMutualConnection(data);
    } catch (error) {
      logger.error('Error sending connection request:', error);
      throw error;
    }
  }

  static async acceptConnectionRequest(connectionId: string): Promise<MutualConnection> {
    try {
      const { data, error } = await supabase
        .from('mutual_connections')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .select(`
          *,
          requester:requester_id (
            id,
            first_name,
            last_name,
            email,
            role,
            profile_image_url,
            bio
          ),
          receiver:receiver_id (
            id,
            first_name,
            last_name,
            email,
            role,
            profile_image_url,
            bio
          )
        `)
        .single();

      if (error) throw error;

      return this.mapToMutualConnection(data);
    } catch (error) {
      logger.error('Error accepting connection request:', error);
      throw error;
    }
  }

  static async rejectConnectionRequest(connectionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('mutual_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error rejecting connection request:', error);
      throw error;
    }
  }

  static async blockConnection(
    requesterId: string,
    receiverId: string
  ): Promise<MutualConnection> {
    try {
      // First, check if connection exists and update it, or create a new blocked connection
      const { data: existingConnection } = await supabase
        .from('mutual_connections')
        .select('*')
        .or(
          `and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${requesterId})`
        )
        .single();

      if (existingConnection) {
        // Update existing connection to blocked
        const { data, error } = await supabase
          .from('mutual_connections')
          .update({ status: 'blocked' })
          .eq('id', existingConnection.id)
          .select()
          .single();

        if (error) throw error;
        return this.mapToMutualConnection(data);
      } else {
        // Create new blocked connection
        const { data, error } = await supabase
          .from('mutual_connections')
          .insert({
            requester_id: requesterId,
            receiver_id: receiverId,
            status: 'blocked',
            requested_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return this.mapToMutualConnection(data);
      }
    } catch (error) {
      logger.error('Error blocking connection:', error);
      throw error;
    }
  }

  // ===== CONNECTION QUERIES =====

  static async getConnectionRequests(userId: string): Promise<ConnectionRequest[]> {
    try {
      const { data: requests, error } = await supabase
        .from('mutual_connections')
        .select(`
          *,
          requester:requester_id (
            id,
            first_name,
            last_name,
            email,
            role,
            profile_image_url,
            bio
          )
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      return requests?.map((request: any) => ({
        id: request.id,
        requesterId: request.requester_id,
        receiverId: request.receiver_id,
        message: request.message,
        status: request.status,
        createdAt: request.requested_at,
        requester: this.mapToUser(request.requester),
      })) || [];
    } catch (error) {
      logger.error('Error fetching connection requests:', error);
      throw error;
    }
  }

  static async getMutualConnections(userId: string): Promise<MutualConnection[]> {
    try {
      const { data: connections, error } = await supabase
        .from('mutual_connections')
        .select(`
          *,
          requester:requester_id (
            id,
            first_name,
            last_name,
            email,
            role,
            profile_image_url,
            bio
          ),
          receiver:receiver_id (
            id,
            first_name,
            last_name,
            email,
            role,
            profile_image_url,
            bio
          )
        `)
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: false });

      if (error) throw error;

      return connections?.map((connection: any) => this.mapToMutualConnection(connection)) || [];
    } catch (error) {
      logger.error('Error fetching mutual connections:', error);
      throw error;
    }
  }

  static async getConnectionStatus(
    userId1: string,
    userId2: string
  ): Promise<ConnectionStatus | null> {
    try {
      const { data: connection } = await supabase
        .from('mutual_connections')
        .select('status')
        .or(
          `and(requester_id.eq.${userId1},receiver_id.eq.${userId2}),and(requester_id.eq.${userId2},receiver_id.eq.${userId1})`
        )
        .single();

      return connection?.status || null;
    } catch (error) {
      logger.error('Error checking connection status:', error);
      return null;
    }
  }

  static async searchConnectedUsers(
    userId: string,
    searchTerm: string,
    userType?: 'contractor' | 'homeowner'
  ): Promise<User[]> {
    try {
      // Get user's connections first
      const connections = await this.getMutualConnections(userId);
      const connectedUserIds = connections.map(conn =>
        conn.requesterId === userId ? conn.receiverId : conn.requesterId
      );

      if (connectedUserIds.length === 0) {
        return [];
      }

      let query = supabase
        .from('users')
        .select('*')
        .in('id', connectedUserIds)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);

      if (userType) {
        query = query.eq('role', userType);
      }

      const { data: users, error } = await query;

      if (error) throw error;

      return users?.map((user: any) => this.mapToUser(user)) || [];
    } catch (error) {
      logger.error('Error searching connected users:', error);
      throw error;
    }
  }

  // ===== FEED INTEGRATION =====

  static async getConnectedUsersFeed(userId: string): Promise<any[]> {
    try {
      // Get user's connections
      const connections = await this.getMutualConnections(userId);
      const connectedUserIds = connections.map(conn =>
        conn.requesterId === userId ? conn.receiverId : conn.requesterId
      );

      if (connectedUserIds.length === 0) {
        return [];
      }

      // Get posts from connected users (contractors only)
      const connectedContractorIds = connections
        .filter(conn => {
          const otherUser = conn.requesterId === userId ? conn.receiver : conn.requester;
          return otherUser?.role === 'contractor';
        })
        .map(conn => conn.requesterId === userId ? conn.receiverId : conn.requesterId);

      if (connectedContractorIds.length === 0) {
        return [];
      }

      const { data: posts, error } = await supabase
        .from('contractor_posts')
        .select(`
          *,
          contractor:contractor_id (
            id,
            first_name,
            last_name,
            profile_image_url,
            rating
          )
        `)
        .in('contractor_id', connectedContractorIds)
        .eq('is_active', true)
        .eq('is_flagged', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return posts || [];
    } catch (error) {
      logger.error('Error fetching connected users feed:', error);
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  private static mapToMutualConnection(data: any): MutualConnection {
    return {
      id: data.id,
      requesterId: data.requester_id,
      receiverId: data.receiver_id,
      status: data.status,
      requestedAt: data.requested_at,
      acceptedAt: data.accepted_at,
      requester: data.requester ? this.mapToUser(data.requester) : undefined,
      receiver: data.receiver ? this.mapToUser(data.receiver) : undefined,
    };
  }

  private static mapToUser(data: any): User {
    return {
      id: data.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      role: data.role,
      created_at: data.created_at,
      updated_at: data.updated_at,
      firstName: data.first_name,
      lastName: data.last_name,
      createdAt: data.created_at,
      profileImageUrl: data.profile_image_url,
      bio: data.bio,
    };
  }
}