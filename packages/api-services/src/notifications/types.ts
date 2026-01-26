/**
 * Notification Types and Interfaces
 */

export enum NotificationType {
    JOB_CREATED = 'job_created',
    JOB_ASSIGNED = 'job_assigned',
    JOB_COMPLETED = 'job_completed',
    BID_RECEIVED = 'bid_received',
    BID_ACCEPTED = 'bid_accepted',
    BID_REJECTED = 'bid_rejected',
    PAYMENT_RECEIVED = 'payment_received',
    PAYMENT_RELEASED = 'payment_released',
    MESSAGE_RECEIVED = 'message_received',
    REVIEW_REQUESTED = 'review_requested',
    REVIEW_RECEIVED = 'review_received',
    CONTRACT_SIGNED = 'contract_signed',
    MILESTONE_COMPLETED = 'milestone_completed',
    SYSTEM_ANNOUNCEMENT = 'system_announcement'
}

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    read: boolean;
    actionUrl?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    readAt?: string;
}

export interface NotificationPreferences {
    email: boolean;
    sms: boolean;
    push: boolean;
    in_app: boolean;
}

export interface NotificationSettings {
    quietHoursStart?: string; // e.g., "22:00"
    quietHoursEnd?: string;   // e.g., "08:00"
    frequency?: 'instant' | 'digest' | 'weekly';
    categories?: {
        [key: string]: boolean;
    };
}
