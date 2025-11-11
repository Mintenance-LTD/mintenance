import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { JobStatusAgent } from '@/lib/services/agents/JobStatusAgent';
import { requireCSRF } from '@/lib/csrf';
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
    
    // CSRF protection
    await requireCSRF(request);
const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: threadId } = await context.params;
    if (!threadId) {
      return NextResponse.json({ error: 'Thread id is required' }, { status: 400 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const messageText = data.content ?? data.messageText ?? '';
    if (!messageText) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const { data: jobData, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id')
      .eq('id', threadId)
      .single();

    if (jobError) {
      console.error('[API] message POST job error', jobError);
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const job = jobData as SupabaseJobRow;
    const isParticipant = job.homeowner_id === user.id || job.contractor_id === user.id;
    if (!isParticipant) {
      console.error('[API] message POST participant check failed', {
        userId: user.id,
        jobHomeownerId: job.homeowner_id,
        jobContractorId: job.contractor_id,
        jobId: threadId,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const inferredReceiverId = job.homeowner_id === user.id ? job.contractor_id : job.homeowner_id;
    const receiverId = data.receiverId ?? inferredReceiverId;

    if (!receiverId) {
      console.error('[API] message POST receiver ID determination failed', {
        userId: user.id,
        jobHomeownerId: job.homeowner_id,
        jobContractorId: job.contractor_id,
        providedReceiverId: data.receiverId,
        inferredReceiverId,
        jobId: threadId,
      });
      return NextResponse.json({ 
        error: 'Receiver could not be determined for this thread',
        details: 'Job may be missing contractor_id or homeowner_id'
      }, { status: 400 });
    }

    const messageType = normalizeMessageType(data.messageType);
    const attachmentUrl = data.attachments?.[0];

    // Build insert payload - only include fields that exist in the schema
    // Note: Different migrations use different column names (content vs message_text)
    // We'll try both to handle schema differences
    const basePayload: Record<string, unknown> = {
      job_id: threadId,
      sender_id: user.id,
      receiver_id: receiverId,
      message_type: messageType,
      read: false,
    };

    if (attachmentUrl) {
      basePayload.attachment_url = attachmentUrl;
    }
    // Note: call_id and call_duration columns don't exist in all schemas, so we exclude them
    // if (data.callId) {
    //   basePayload.call_id = data.callId;
    // }

    // Try insert with message_text first (preferred schema)
    let inserted: SupabaseMessageRow | null = null;
    let insertError: any = null;
    
    const insertPayloadWithMessageText = {
      ...basePayload,
      message_text: messageText,
    };
    
    ({ data: inserted, error: insertError } = await serverSupabase
      .from('messages')
      .insert(insertPayloadWithMessageText)
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
        sender:users!messages_sender_id_fkey(first_name, last_name, role)
      `)
      .single());

    // If message_text column doesn't exist, try with 'content' as fallback
    if (insertError && (insertError.message?.includes('message_text') || insertError.message?.includes('column') && insertError.message?.includes('message_text'))) {
      console.warn('[API] message_text column not found, trying with content column', insertError);
      const insertPayloadWithContent = {
        ...basePayload,
        content: messageText,
      };
      
      ({ data: inserted, error: insertError } = await serverSupabase
        .from('messages')
        .insert(insertPayloadWithContent)
        .select(`
          id,
          job_id,
          sender_id,
          receiver_id,
          content,
          message_type,
          attachment_url,
          read,
          created_at,
          sender:users!messages_sender_id_fkey(first_name, last_name, role, email, company_name)
        `)
        .single());
      
      // If using content column, we need to map it to message_text for the response
      if (inserted && !insertError) {
        inserted = {
          ...inserted,
          message_text: (inserted as any).content || messageText,
        } as SupabaseMessageRow;
      }
    }

    if (insertError) {
      console.error('[API] message POST insert error', {
        error: insertError,
        jobId: threadId,
        senderId: user.id,
        receiverId,
        messageText: messageText.substring(0, 50),
        attemptedPayload: insertError.message?.includes('content') ? 'content' : 'message_text',
      });
      return NextResponse.json({ 
        error: 'Failed to send message',
        details: insertError.message || 'Database insert failed. The messages table schema may need to be checked.'
      }, { status: 500 });
    }

        const message = mapMessageRow(inserted as SupabaseMessageRow);
        
        // Update job's updated_at timestamp so it appears at the top of the messages list
        try {
          await serverSupabase
            .from('jobs')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', threadId);
        } catch (jobUpdateError) {
          // Don't fail the request if job update fails
          console.error('[API] message POST job timestamp update error', {
            error: jobUpdateError,
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
      console.error('[API] message POST notification creation error', {
        error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
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
      console.error('Error in job status evaluation', error, {
        service: 'messages',
        jobId: threadId,
      });
    });
    
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    console.error('[API] message POST error', {
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json({ 
      error: 'Failed to send message',
      details: err instanceof Error ? err.message : 'Unexpected error'
    }, { status: 500 });
  }
}
