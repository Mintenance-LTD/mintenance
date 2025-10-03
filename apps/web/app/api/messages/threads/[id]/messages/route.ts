import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  mapMessageRow,
  MESSAGE_TYPES,
  normalizeMessageType,
  SupabaseJobRow,
  SupabaseMessageRow,
} from '../../../utils';

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const inferredReceiverId = job.homeowner_id === user.id ? job.contractor_id : job.homeowner_id;
    const receiverId = data.receiverId ?? inferredReceiverId;

    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver could not be determined for this thread' }, { status: 400 });
    }

    const messageType = normalizeMessageType(data.messageType);
    const attachmentUrl = data.attachments?.[0];

    const insertPayload: Record<string, unknown> = {
      job_id: threadId,
      sender_id: user.id,
      receiver_id: receiverId,
      message_text: messageText,
      message_type: messageType,
      read: false,
    };

    if (attachmentUrl) {
      insertPayload.attachment_url = attachmentUrl;
    }
    if (data.callId) {
      insertPayload.call_id = data.callId;
    }
    if (typeof data.callDuration === 'number') {
      insertPayload.call_duration = data.callDuration;
    }

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
        call_id,
        call_duration,
        read,
        created_at,
        sender:users!messages_sender_id_fkey(first_name, last_name, role)
      `)
      .single();

    if (insertError) {
      console.error('[API] message POST insert error', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    const message = mapMessageRow(inserted as SupabaseMessageRow);
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    console.error('[API] message POST error', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
