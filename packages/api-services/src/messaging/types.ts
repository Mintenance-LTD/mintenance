/**
 * Messaging Types and Interfaces
 */

export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    FILE = 'file',
    VIDEO_CALL_INVITATION = 'video_call_invitation',
    VIDEO_CALL_STARTED = 'video_call_started',
    VIDEO_CALL_ENDED = 'video_call_ended',
    VIDEO_CALL_MISSED = 'video_call_missed',
    CONTRACT_SUBMITTED = 'contract_submitted',
    SYSTEM = 'system'
}

export interface MessageAttachment {
    id: string;
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    thumbnailUrl?: string;
}

export interface MessageReaction {
    emoji: string;
    userId: string;
    createdAt: string;
}

export interface Message {
    id: string;
    threadId: string;
    senderId: string;
    receiverId?: string;
    content: string;
    type: MessageType;
    attachments?: MessageAttachment[];
    metadata?: Record<string, any>;
    read: boolean;
    edited: boolean;
    editedAt?: string;
    createdAt: string;
    reactions?: MessageReaction[];
}

export interface ThreadParticipant {
    userId: string;
    name: string;
    role: string;
    profileImage?: string;
    online?: boolean;
    typing?: boolean;
    lastSeen?: string;
}

export interface MessageThread {
    id: string;
    jobId?: string;
    title?: string;
    type: 'direct' | 'group' | 'job';
    participants: ThreadParticipant[];
    lastMessage?: Message;
    unreadCount: number;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    archived: boolean;
    muted: boolean;
}
