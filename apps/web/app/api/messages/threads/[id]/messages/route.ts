import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { JobStatusAgent } from '@/lib/services/agents/JobStatusAgent';
import { logger } from '@mintenance/shared';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '@/lib/errors/api-error';
import { EmailService } from '@/lib/email-service';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
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
  content: z
    .string()
    .trim()
    .min(1)
    .optional()
    .transform((val) => (val ? sanitizeMessage(val) : val)),
  messageText: z
    .string()
    .trim()
    .min(1)
    .optional()
    .transform((val) => (val ? sanitizeMessage(val) : val)),
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

    // Fetch messages by job_id (actual DB schema — messages table has job_id,
    // sender_id, receiver_id, content, read; NOT thread_id/metadata/read_by)
    const { data: messageData, error: messagesError } = await serverSupabase
      .from('messages')
      .select(
        'id, job_id, sender_id, receiver_id, content, message_type, attachment_url, read, created_at'
      )
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

    const messages = (messageData ?? []).map((row: ActualMessageRow) =>
      mapActualMessageRow(row, jobId, user.id)
    );

    // Mark messages addressed to this user as read (fire and forget)
    Promise.resolve(
      serverSupabase
        .from('messages')
        .update({ read: true })
        .eq('job_id', jobId)
        .eq('receiver_id', user.id)
        .eq('read', false)
    ).catch((err: unknown) => {
      logger.error('Failed to mark messages as read', err, {
        service: 'messages',
        jobId,
        userId: user.id,
      });
    });

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
    const firstAttachment = data.attachments?.[0];
    // Allow text-only, attachment-only, or both. Previously required
    // non-empty text which blocked image/file-only sends from mobile.
    if (!messageText && !firstAttachment) {
      throw new BadRequestError('Message content or attachment is required');
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

    const isParticipant =
      jobData.homeowner_id === user.id || jobData.contractor_id === user.id;
    if (!isParticipant) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    const receiverId =
      data.receiverId ??
      (jobData.homeowner_id === user.id
        ? jobData.contractor_id
        : jobData.homeowner_id);

    const messageType = normalizeMessageType(data.messageType);
    const attachmentUrl = data.attachments?.[0];

    // Validate attachment URL if provided.
    // Sprint 7 fix (3.4): the legacy check only verified host prefix, which
    // let any authenticated user reference another user's uploaded file by
    // pasting their URL. We now also parse the storage path, look the object
    // up in storage.objects, and verify `owner = user.id`. This closes the
    // path-traversal / file-reference hijack window.
    if (attachmentUrl) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!attachmentUrl.startsWith('https://')) {
        throw new BadRequestError('Attachment URL must use HTTPS');
      }
      if (supabaseUrl && !attachmentUrl.startsWith(supabaseUrl)) {
        throw new BadRequestError('Attachment must be from official storage');
      }

      const parsed = new URL(attachmentUrl);
      const pathname = parsed.pathname.toLowerCase();
      const allowedExtensions = [
        '.pdf',
        '.doc',
        '.docx',
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.heic',
      ];
      if (!allowedExtensions.some((ext) => pathname.endsWith(ext))) {
        throw new BadRequestError('File type not allowed');
      }

      // Extract {bucket} and {objectPath} from Supabase storage URLs.
      // Known shapes:
      //   /storage/v1/object/public/<bucket>/<path>
      //   /storage/v1/object/sign/<bucket>/<path>    (with ?token=...)
      //   /storage/v1/object/authenticated/<bucket>/<path>
      const storageMatch = parsed.pathname.match(
        /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
      );
      if (!storageMatch) {
        throw new BadRequestError(
          'Attachment URL is not a recognized Supabase storage object'
        );
      }
      const [, bucketId, objectPath] = storageMatch;
      const decodedPath = decodeURIComponent(objectPath);

      // Verify the current user uploaded this object. Supabase tracks the
      // uploader in storage.objects.owner (auth.uid() at upload time).
      const { data: objectRow, error: objectError } = await serverSupabase
        .schema('storage')
        .from('objects')
        .select('owner, bucket_id, name')
        .eq('bucket_id', bucketId)
        .eq('name', decodedPath)
        .maybeSingle();

      if (objectError || !objectRow) {
        logger.warn('Attachment URL points to unknown storage object', {
          service: 'messages',
          userId: user.id,
          bucketId,
          decodedPath,
          error: objectError?.message,
        });
        throw new BadRequestError('Attachment not found in storage');
      }

      if (objectRow.owner && objectRow.owner !== user.id) {
        logger.warn(
          'Attachment ownership mismatch — user referencing another user file',
          {
            service: 'messages',
            userId: user.id,
            ownerId: objectRow.owner,
            bucketId,
            decodedPath,
          }
        );
        throw new ForbiddenError(
          'You may only attach files you uploaded yourself.'
        );
      }
    }

    if (!receiverId) {
      throw new BadRequestError(
        'Cannot determine message receiver — job missing contractor or homeowner'
      );
    }

    // Insert message using actual DB schema: job_id, sender_id, receiver_id,
    // content, message_type, attachment_url, read
    const insertPayload: Record<string, unknown> = {
      job_id: jobId,
      sender_id: user.id,
      receiver_id: receiverId,
      content: messageText,
      message_type: messageType,
      attachment_url: attachmentUrl ?? null,
      read: false,
    };

    const { data: inserted, error: insertError } = await serverSupabase
      .from('messages')
      .insert(insertPayload)
      .select(
        'id, job_id, sender_id, receiver_id, content, message_type, attachment_url, read, created_at'
      )
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
    const message = mapActualMessageRow(
      inserted as ActualMessageRow,
      jobId,
      user.id
    );

    // Update message_thread last_message_at (if thread exists)
    Promise.resolve(
      serverSupabase
        .from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('job_id', jobId)
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
          ? senderData.first_name && senderData.last_name
            ? `${senderData.first_name} ${senderData.last_name}`
            : senderData.company_name || 'Someone'
          : 'Someone';

        const messagePreview = messageText.substring(0, 80);

        // Route through NotificationService so push goes out alongside
        // the in-app row, and the user's preference/quiet-hours settings
        // are honoured. Direct `.from('notifications').insert(...)` here
        // silently skipped push for every message for months.
        // 2026-05-21 Mint Editorial voice — sender as title, message
        // preview as body (matches WhatsApp/iMessage feel).
        await NotificationService.createNotification({
          userId: receiverId,
          type: 'message_received',
          title: senderName,
          message: `${messagePreview}${messageText.length > 80 ? '…' : ''}`,
          actionUrl: `/messages?jobId=${jobId}`,
          metadata: { jobId, senderId: user.id },
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
              messagePreview:
                messagePreview + (messageText.length > 80 ? '...' : ''),
              viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://mintenance.com')}/messages/${jobId}?userId=${user.id}&userName=${encodeURIComponent(senderName)}`,
            });
          }
        } catch (emailError) {
          logger.error('Message POST email notification error', emailError, {
            service: 'messages',
            receiverId,
            jobId,
          });
        }
        // 2026-05-23 audit-16 P2: a second NotificationService import +
        // createNotification call lived here. The earlier call above
        // (with metadata: { jobId, senderId }) already does the in-app
        // insert AND the push via NotificationService.createNotification
        // — the wrapper fans out to both channels. This block produced
        // an exact duplicate row + a duplicate push, AND dropped the
        // jobId/senderId metadata so the second push couldn't deep-link.
        // Removed; the upstream call already covers in-app + push +
        // honours quiet-hours / preferences.
      } catch (notificationError) {
        logger.error(
          'Message POST notification creation error',
          notificationError,
          {
            service: 'messages',
            receiverId,
            jobId,
          }
        );
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
