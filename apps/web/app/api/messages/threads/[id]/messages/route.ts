import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { JobStatusAgent } from '@/lib/services/agents/JobStatusAgent';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { sanitizeMessage } from '@/lib/sanitizer';
import {
  MESSAGE_TYPES,
  normalizeMessageType,
  SupabaseMessageRow,
  mapMessageRow,
} from '@/app/api/messages/utils';
import { validateRequest } from '@/lib/validation/validator';

const bodySchema = z.object({
  content: z.string().trim().min(1).optional().transform(val => val ? sanitizeMessage(val) : val),
  messageText: z.string().trim().min(1).optional().transform(val => val ? sanitizeMessage(val) : val),
  receiverId: z.string().uuid().optional(),
  messageType: z.enum(MESSAGE_TYPES).optional(),
  attachments: z.array(z.string().trim().min(1)).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: Params) {
  try {
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 30
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(30),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      );
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to view messages');
    }

    const { id: jobId } = await context.params;
    if (!jobId) {
      throw new BadRequestError('Job id is required');
    }

    // Verify user is a participant via the jobs table
    const { data: jobData, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id')
      .eq('id', jobId)
      .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`)
      .single();

    if (jobError || !jobData) {
      throw new NotFoundError('Thread not found or access denied');
    }

    // Fetch messages directly by job_id (production schema uses job_id, not thread_id)
    const { data: messageData, error: messagesError } = await serverSupabase
      .from('messages')
      .select('id, job_id, sender_id, receiver_id, content, message_type, read, attachment_url, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      logger.error('Failed to load thread messages', messagesError, {
        service: 'messages',
        jobId,
        userId: user.id,
      });
      throw messagesError;
    }

    const messages = (messageData ?? []).map((row: Record<string, unknown>) =>
      mapMessageRow(row as unknown as SupabaseMessageRow)
    );

    return NextResponse.json({ messages });
  } catch (err) {
    return handleAPIError(err);
  }
}

export async function POST(request: NextRequest, context: Params) {
  try {
    // Rate limiting check
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 30
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(30),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      );
    }

    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to send messages');
    }

    const { id: jobId } = await context.params;
    if (!jobId) {
      throw new BadRequestError('Job id is required');
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, bodySchema);
    if ('headers' in validation) {
      return validation;
    }

    const data = validation.data;
    const messageText = data.content ?? data.messageText ?? '';
    if (!messageText) {
      throw new BadRequestError('Message content is required');
    }

    // Verify job exists and user is participant
    const { data: jobData, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, title, homeowner_id, contractor_id')
      .eq('id', jobId)
      .single();

    if (jobError || !jobData) {
      logger.error('Message POST job error', jobError, {
        service: 'messages',
        jobId,
      });
      throw new NotFoundError('Thread not found');
    }

    const isParticipant = jobData.homeowner_id === user.id || jobData.contractor_id === user.id;
    if (!isParticipant) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    const receiverId = data.receiverId
      ?? (jobData.homeowner_id === user.id ? jobData.contractor_id : jobData.homeowner_id);

    const messageType = normalizeMessageType(data.messageType);
    const attachmentUrl = data.attachments?.[0];

    // Insert message using production schema columns (job_id, receiver_id, read, attachment_url)
    const insertPayload: Record<string, unknown> = {
      job_id: jobId,
      sender_id: user.id,
      receiver_id: receiverId,
      content: messageText,
      message_type: messageType,
      read: false,
    };

    if (attachmentUrl) {
      insertPayload.attachment_url = attachmentUrl;
    }

    const { data: inserted, error: insertError } = await serverSupabase
      .from('messages')
      .insert(insertPayload)
      .select('id, job_id, sender_id, receiver_id, content, message_type, read, attachment_url, created_at')
      .single();

    if (insertError) {
      logger.error('Message POST insert error', insertError, {
        service: 'messages',
        jobId,
        senderId: user.id,
        messageText: messageText.substring(0, 50),
      });
      throw insertError;
    }

    // Map to frontend response format
    const message = mapMessageRow(inserted as unknown as SupabaseMessageRow);

    // Update message_thread last_message_at (if thread exists)
    serverSupabase
      .from('message_threads')
      .update({ last_message_at: new Date().toISOString() })
      .eq('job_id', jobId)
      .then(() => {})
      .catch((err: unknown) => {
        logger.error('Failed to update thread last_message_at', err, {
          service: 'messages',
          jobId,
        });
      });

    // Update job's updated_at timestamp
    Promise.resolve(
      serverSupabase
        .from('jobs')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', jobId)
    ).catch((jobUpdateError: unknown) => {
      logger.error('Message POST job timestamp update error', jobUpdateError, {
        service: 'messages',
        jobId,
      });
    });

    // Create notification for the receiver
    if (receiverId) {
      try {
        const { data: senderData } = await serverSupabase
          .from('profiles')
          .select('first_name, last_name, company_name')
          .eq('id', user.id)
          .single();

        const senderName = senderData
          ? (senderData.first_name && senderData.last_name
              ? `${senderData.first_name} ${senderData.last_name}`
              : senderData.company_name || 'Someone')
          : 'Someone';

        const messagePreview = messageText.substring(0, 80);

        await serverSupabase
          .from('notifications')
          .insert({
            user_id: receiverId,
            title: 'New Message',
            message: `${senderName}: ${messagePreview}${messageText.length > 80 ? '...' : ''}`,
            type: 'message_received',
            read: false,
            action_url: `/messages/${jobId}?userId=${user.id}&userName=${encodeURIComponent(senderName)}&jobTitle=${encodeURIComponent(jobData.title || 'Job')}`,
            created_at: new Date().toISOString(),
          });
      } catch (notificationError) {
        logger.error('Message POST notification creation error', notificationError, {
          service: 'messages',
          receiverId,
          jobId,
        });
      }
    }

    // Trigger job status evaluation after new message
    JobStatusAgent.evaluateAutoComplete(jobId, {
      jobId,
      userId: user.id,
    }).catch((error) => {
      logger.error('Error in job status evaluation', error, {
        service: 'messages',
        jobId,
      });
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    return handleAPIError(err);
  }
}
