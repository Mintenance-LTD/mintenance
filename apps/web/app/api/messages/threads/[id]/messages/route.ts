import { NextRequest, NextResponse } from 'next/server';
import type { Message } from '@mintenance/types/src/contracts';
import { getCurrentUserFromCookies } from '@/lib/auth';

interface Params { params: { id: string } }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Thread id is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const message: Message = {
      id: 'placeholder',
      jobId: id,
      senderId: user.id,
      receiverId: body?.receiverId ?? '',
      messageText: body?.content ?? '',
      messageType: body?.messageType ?? 'text',
      attachmentUrl: body?.attachments?.[0],
      callId: body?.callId,
      callDuration: body?.callDuration,
      read: false,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    console.error('[API] message POST error', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}