import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { z } from 'zod';
import { handleAPIError, UnauthorizedError, BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';

// ==========================================================
// VALIDATION SCHEMAS
// ==========================================================

const reactionSchema = z.object({
  emoji: z
    .string()
    .min(1, 'Emoji is required')
    .max(10, 'Emoji too long')
    .regex(/^[\p{Emoji}\u200d]+$/u, 'Invalid emoji format'),
});

// ==========================================================
// POST /api/messages/:id/react
// Toggle reaction on a message (add if not exists, remove if exists)
// ==========================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Step 1: Authentication check
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to react to messages');
    }

    // Step 2: Validate request body
    const body = await request.json();
    const parsed = reactionSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestError('Invalid emoji format');
    }

    const { emoji } = parsed.data;
    const { id: messageId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      throw new BadRequestError('Invalid message ID format');
    }

    const supabase = serverSupabase;

    // Step 3: Verify message exists and user has access
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      throw new NotFoundError('Message not found');
    }

    // Step 4: Verify user has access (must be sender or receiver)
    const hasAccess =
      message.sender_id === user.id || message.receiver_id === user.id;

    if (!hasAccess) {
      throw new ForbiddenError('You do not have permission to react to this message');
    }

    // Step 5: Check if reaction already exists (toggle behavior)
    const { data: existingReaction, error: fetchError } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (fetchError) {
      logger.error('Error checking existing reaction', fetchError, {
        service: 'messages',
        messageId,
        userId: user.id,
      });
      throw fetchError;
    }

    if (existingReaction) {
      // Step 6a: Remove reaction (toggle off)
      const { error: deleteError } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError) {
        logger.error('Error deleting reaction', deleteError, {
          service: 'messages',
          messageId,
          userId: user.id,
        });
        throw deleteError;
      }

      return NextResponse.json({
        success: true,
        action: 'removed',
        emoji,
        messageId,
      });
    } else {
      // Step 6b: Add reaction (toggle on)
      const { error: insertError } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });

      if (insertError) {
        logger.error('Error adding reaction', insertError, {
          service: 'messages',
          messageId,
          userId: user.id,
          emoji,
        });

        // Handle unique constraint violation gracefully
        if (insertError.code === '23505') {
          throw new ConflictError('Reaction already exists');
        }

        throw insertError;
      }

      return NextResponse.json({
        success: true,
        action: 'added',
        emoji,
        messageId,
      });
    }
  } catch (error) {
    return handleAPIError(error);
  }
}

// ==========================================================
// GET /api/messages/:id/react
// Fetch all reactions for a message (grouped by emoji)
// ==========================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Step 1: Authentication check
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to view reactions');
    }

    const { id: messageId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      throw new BadRequestError('Invalid message ID format');
    }

    const supabase = serverSupabase;

    // Step 2: Verify message exists and user has access
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      throw new NotFoundError('Message not found');
    }

    // Step 3: Verify access
    const hasAccess =
      message.sender_id === user.id || message.receiver_id === user.id;

    if (!hasAccess) {
      throw new ForbiddenError('You do not have permission to view reactions for this message');
    }

    // Step 4: Fetch all reactions for this message
    const { data: reactions, error: reactionsError } = await supabase
      .from('message_reactions')
      .select('id, emoji, user_id, created_at')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    if (reactionsError) {
      logger.error('Error fetching reactions', reactionsError, {
        service: 'messages',
        messageId,
        userId: user.id,
      });
      throw reactionsError;
    }

    // Step 5: Group reactions by emoji
    const grouped = (reactions || []).reduce(
      (acc, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = {
            emoji: reaction.emoji,
            count: 0,
            users: [],
            userReacted: false,
          };
        }

        acc[reaction.emoji].count++;
        acc[reaction.emoji].users.push(reaction.user_id);

        if (reaction.user_id === user.id) {
          acc[reaction.emoji].userReacted = true;
        }

        return acc;
      },
      {} as Record<
        string,
        {
          emoji: string;
          count: number;
          users: string[];
          userReacted: boolean;
        }
      >
    );

    // Step 6: Return grouped reactions
    return NextResponse.json({
      success: true,
      messageId,
      reactions: Object.values(grouped),
      totalReactions: reactions?.length || 0,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// ==========================================================
// OPTIONS - CORS Preflight (if needed)
// ==========================================================

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
