import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { JobStatusAgent } from '@/lib/services/agents/JobStatusAgent';
import { logger } from '@mintenance/shared';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/lib/errors/api-error';
import { EmailService } from '@/lib/email-service';
import { sanitizeMessage } from '@/lib/sanitizer';
import {
  MESSAGE_TYPES,
  normalizeMessageType,
  ActualMessageRow,
  mapActualMessageRow,
} from '@/app/api/messages/utils';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

const bodySchema = z.object({
  content: z.string().trim().min(1).optional().transform(val => val ? sanitizeMessage(val) : val),
  messageText: z.string().trim().min(1).optional().transform(val => val ? sanitizeMessage(val) : val),
  receiverId: z.string().uuid().optional(),
  messageType: z.enum(MESSAGE_TYPES).optional(),
  attachments: z.array(z.string().trim().min(1)).optional(),
});

export const GET = withApiHandler(
  { csrf: false, rateLimit: { maxRequests: 30 } },
  async (request: NextRequest, { user, params }) => {
    const jobId = params.id;
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

    // Find the message_thread for this job
    const { data: threadData } = await serverSupabase
      .from('message_threads')
      .select('id')
      .eq('job_id', jobId)
      .single();

    if (!threadData) {
      return NextResponse.json({ messages: [] });
    }

    // Fetch messages using thread_id (production schema)
    const { data: messageData, error: messagesError } = await serverSupabase
      .from('messages')
      .select('id, thread_id, sender_id, content, message_type, metadata, read_by, created_at')
      .eq('thread_id', threadData.id)
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
      mapActualMessageRow(row as unknown as ActualMessageRow, jobId, user.id)
    );

    return NextResponse.json({ messages });
  }
);

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request: NextRequest, { user, params }) => {
    const jobId = params.id;
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

    // Validate attachment URL if provided (FIX HIGH-3: file upload validation)
    if (attachmentUrl) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!attachmentUrl.startsWith('https://')) {
        throw new BadRequestError('Attachment URL must use HTTPS');
      }
      if (supabaseUrl && !attachmentUrl.startsWith(supabaseUrl)) {
        throw new BadRequestError('Attachment must be from official storage');
      }
      const pathname = new URL(attachmentUrl).pathname.toLowerCase();
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];
      if (!allowedExtensions.some(ext => pathname.endsWith(ext))) {
        throw new BadRequestError('File type not allowed');
      }
    }

    // Find or create message_thread for this job
    let threadId: string;
    const { data: existingThread } = await serverSupabase
      .from('message_threads')
      .select('id')
      .eq('job_id', jobId)
      .single();

    if (existingThread) {
      threadId = existingThread.id;
    } else {
      const { data: newThread, error: threadError } = await serverSupabase
        .from('message_threads')
        .insert({
          job_id: jobId,
          participant_ids: [user.id, receiverId].filter(Boolean),
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (threadError || !newThread) {
        logger.error('Failed to create message thread', threadError, { service: 'messages', jobId });
        throw new BadRequestError('Failed to create message thread');
      }
      threadId = newThread.id;
    }

    // Build metadata for optional fields
    const metadata: Record<string, unknown> = {};
    if (attachmentUrl) {
      metadata.attachment_url = attachmentUrl;
    }

    // Insert message using production schema (thread_id, content, read_by, metadata)
    const insertPayload: Record<string, unknown> = {
      thread_id: threadId,
      sender_id: user.id,
      content: messageText,
      message_type: messageType,
      read_by: [user.id],
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    };

    const { data: inserted, error: insertError } = await serverSupabase
      .from('messages')
      .insert(insertPayload)
      .select('id, thread_id, sender_id, content, message_type, metadata, read_by, created_at')
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
    const message = mapActualMessageRow(inserted as unknown as ActualMessageRow, jobId, user.id);

    // Update message_thread last_message_at
    Promise.resolve(
      serverSupabase
        .from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', threadId)
    ).catch((err: unknown) => {
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
            action_url: `/messages?jobId=${jobId}`,
            created_at: new Date().toISOString(),
          });
        // Send email notification to the receiver
        try {
          const { data: receiverProfile } = await serverSupabase
            .from('profiles')
            .select('first_name, email')
            .eq('id', receiverId)
            .single();

          if (receiverProfile?.email) {
            const jobTitle = jobData.title || 'your job';
            await EmailService.sendMessageNotification(receiverProfile.email, {
              recipientName: receiverProfile.first_name || 'there',
              senderName,
              jobTitle,
              messagePreview: messagePreview + (messageText.length > 80 ? '...' : ''),
              viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://mintenance.com')}/messages?jobId=${jobId}`,
            });
          }
        } catch (emailError) {
          logger.error('Message POST email notification error', emailError, {
            service: 'messages',
            receiverId,
            jobId,
          });
        }
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
  }
);
