/**
 * Analytics Types and Enums
 */

export enum EventType {
    // User Events
    USER_SIGNUP = 'user.signup',
    USER_LOGIN = 'user.login',
    USER_LOGOUT = 'user.logout',
    USER_PROFILE_UPDATE = 'user.profile.update',

    // Job Events
    JOB_CREATED = 'job.created',
    JOB_UPDATED = 'job.updated',
    JOB_ASSIGNED = 'job.assigned',
    JOB_COMPLETED = 'job.completed',
    JOB_CANCELLED = 'job.cancelled',
    JOB_VIEWED = 'job.viewed',

    // Bid Events
    BID_SUBMITTED = 'bid.submitted',
    BID_ACCEPTED = 'bid.accepted',
    BID_REJECTED = 'bid.rejected',
    BID_WITHDRAWN = 'bid.withdrawn',

    // Payment Events
    PAYMENT_INITIATED = 'payment.initiated',
    PAYMENT_COMPLETED = 'payment.completed',
    PAYMENT_FAILED = 'payment.failed',
    PAYMENT_REFUNDED = 'payment.refunded',

    // Message Events
    MESSAGE_SENT = 'message.sent',
    MESSAGE_READ = 'message.read',
    VIDEO_CALL_STARTED = 'video_call.started',
    VIDEO_CALL_ENDED = 'video_call.ended',

    // Review Events
    REVIEW_SUBMITTED = 'review.submitted',
    REVIEW_UPDATED = 'review.updated',

    // Search Events
    SEARCH_PERFORMED = 'search.performed',
    SEARCH_RESULT_CLICKED = 'search.result_clicked',

    // System Events
    ERROR_OCCURRED = 'error.occurred',
    API_CALLED = 'api.called',
    PERFORMANCE_METRIC = 'performance.metric'
}

export interface AnalyticsEvent {
    id?: string;
    type: EventType;
    userId?: string;
    sessionId?: string;
    timestamp: string;
    properties?: Record<string, any>;
    metadata?: {
        ip?: string;
        userAgent?: string;
        referrer?: string;
        url?: string;
        duration?: number;
    };
}

export interface EventFilters {
    userId?: string;
    sessionId?: string;
    types?: EventType[];
    startDate?: Date;
    endDate?: Date;
    properties?: Record<string, any>;
    limit?: number;
    offset?: number;
}

export interface EventAggregation {
    count: number;
    uniqueUsers: number;
    uniqueSessions: number;
    avgDuration?: number;
    conversion?: number;
}

export interface TimeSeriesData {
    timestamp: string;
    count: number;
    uniqueUsers: number;
    events: EventType[];
}
