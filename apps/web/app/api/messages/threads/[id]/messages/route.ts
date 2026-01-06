import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { JobStatusAgent } from '@/lib/services/agents/JobStatusAgent';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import {
  mapMessageRow,
  MESSAGE_TYPES,
  normalizeMessageType,
  SupabaseJobRow,
  SupabaseMessageRow,
} from '@/app/api/messages/utils';

const bodySchema = z.object({
  content: z.string().trim().min(1).optional(),
  messageText: z.string().trim().min(1).optional(),
  receiverId: z.string().uuid().optional(),
  messageType: z.enum(MESSAGE_TYPES).optional(),
  attachments: z.array(z.string().trim().min(1)).optional(),
  callId: z.string().trim().min(1).optional(),
  callDuration: z.number().int().nonnegative().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
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

    const { id: threadId } = await context.params;
    if (!threadId) {
      throw new BadRequestError('Thread id is required');
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new BadRequestError('Invalid payload');
    }

    const data = parsed.data;
    const messageText = data.content ?? data.messageText ?? '';
    if (!messageText) {
      throw new BadRequestError('Message content is required');
    }

    const { data: jobData, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id')
      .eq('id', threadId)
      .single();

    if (jobError || !jobData) {
      logger.error('Message POST job error', jobError, {
        service: 'messages',
        threadId,
      });
      throw new NotFoundError('Thread not found');
    }

    const job = jobData as SupabaseJobRow;
    const isParticipant = job.homeowner_id === user.id || job.contractor_id === user.id;
    if (!isParticipant) {
      logger.warn('Message POST participant check failed', {
        service: 'messages',
        userId: user.id,
        jobHomeownerId: job.homeowner_id,
        jobContractorId: job.contractor_id,
        jobId: threadId,
      });
      throw new ForbiddenError('You are not a participant in this thread');
    }

    const inferredReceiverId = job.homeowner_id === user.id ? job.contractor_id : job.homeowner_id;
    const receiverId = data.receiverId ?? inferredReceiverId;

    if (!receiverId) {
      logger.error('Message POST receiver ID determination failed', {
        service: 'messages',
        userId: user.id,
        jobHomeownerId: job.homeowner_id,
        jobContractorId: job.contractor_id,
        providedReceiverId: data.receiverId,
        inferredReceiverId,
        jobId: threadId,
      });
      throw new BadRequestError('Receiver could not be determined for this thread');
    }

    const messageType = normalizeMessageType(data.messageType);
    const attachmentUrl = data.attachments?.[0];

    // Build insert payload - use 'message_text' column (schema uses 'message_text')
    const insertPayload: Record<string, unknown> = {
      job_id: threadId,
      sender_id: user.id,
      receiver_id: receiverId,
      message_text: messageText, // Use 'message_text' column (schema uses 'message_text')
      message_type: messageType,
      read: false,
    };

    if (attachmentUrl) {
      insertPayload.attachment_url = attachmentUrl;
    }
    // Note: call_id and call_duration columns don't exist in all schemas, so we exclude them
    // if (data.callId) {
    //   insertPayload.call_id = data.callId;
    // }

    const { data: inserted, error: insertError } = await serverSupabase
      .from('messages')
      .insert(insertPayload)
      .select(`
        id,
        job_id,
        sender_id,
        receiver_id,
        message_text,
        message_type,
        attachment_url,
        read,
        created_at,
        sender:users!messages_sender_id_fkey(first_name, last_name, role, email, company_name)
      `)
      .single();

    if (insertError) {
      logger.error('Message POST insert error', insertError, {
        service: 'messages',
        jobId: threadId,
        senderId: user.id,
        receiverId,
        messageText: messageText.substring(0, 50),
      });
      throw insertError;
    }

    // Map inserted data to response format (mapMessageRow handles content -> messageText conversion)
    const message = mapMessageRow(inserted as SupabaseMessageRow);
        
        // Update job's updated_at timestamp so it appears at the top of the messages list
        try {
          await serverSupabase
            .from('jobs')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', threadId);
        } catch (jobUpdateError) {
          // Don't fail the request if job update fails
          logger.error('Message POST job timestamp update error', jobUpdateError, {
            service: 'messages',
            jobId: threadId,
          });
        }
        
        // Create notification for the receiver
    try {
      const { data: jobData } = await serverSupabase
        .from('jobs')
        .select('title, homeowner_id, contractor_id')
        .eq('id', threadId)
        .single();
      
      const { data: senderData } = await serverSupabase
        .from('users')
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
          action_url: `/messages/${threadId}?userId=${user.id}&userName=${encodeURIComponent(senderName)}&jobTitle=${encodeURIComponent(jobData?.title || 'Job')}`,
          created_at: new Date().toISOString(),
        });
    } catch (notificationError) {
      // Don't fail the request if notification creation fails
      logger.error('Message POST notification creation error', notificationError, {
        service: 'messages',
        receiverId,
        jobId: threadId,
      });
    }

    // Trigger job status evaluation after new message (for auto-complete detection)
    // Run asynchronously to avoid blocking the response
    JobStatusAgent.evaluateAutoComplete(threadId, {
      jobId: threadId,
      userId: user.id,
    }).catch((error) => {
      logger.error('Error in job status evaluation', error, {
        service: 'messages',
        jobId: threadId,
      });
    });
    
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    return handleAPIError(err);
  }
}
