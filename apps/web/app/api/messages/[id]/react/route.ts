import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { z } from 'zod';

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
    // Step 1: Authentication check
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to react to messages' },
        { status: 401 }
      );
    }

    // Step 2: Validate request body
    const body = await request.json();
    const parsed = reactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Invalid emoji format',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { emoji } = parsed.data;
    const { id: messageId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      return NextResponse.json(
        { error: 'Invalid message ID format' },
        { status: 400 }
      );
    }

    const supabase = serverSupabase;

    // Step 3: Verify message exists and user has access
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found', message: 'The message you are trying to react to does not exist' },
        { status: 404 }
      );
    }

    // Step 4: Verify user has access (must be sender or receiver)
    const hasAccess =
      message.sender_id === user.id || message.receiver_id === user.id;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to react to this message' },
        { status: 403 }
      );
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
      console.error('Error checking existing reaction:', fetchError);
      throw new Error('Failed to check existing reaction');
    }

    if (existingReaction) {
      // Step 6a: Remove reaction (toggle off)
      const { error: deleteError } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError) {
        console.error('Error deleting reaction:', deleteError);
        throw new Error('Failed to remove reaction');
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
        console.error('Error adding reaction:', insertError);

        // Handle unique constraint violation gracefully
        if (insertError.code === '23505') {
          return NextResponse.json(
            { error: 'Reaction already exists' },
            { status: 409 }
          );
        }

        throw new Error('Failed to add reaction');
      }

      return NextResponse.json({
        success: true,
        action: 'added',
        emoji,
        messageId,
      });
    }
  } catch (error) {
    console.error('Error handling reaction:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your reaction',
      },
      { status: 500 }
    );
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
    // Step 1: Authentication check
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view reactions' },
        { status: 401 }
      );
    }

    const { id: messageId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      return NextResponse.json(
        { error: 'Invalid message ID format' },
        { status: 400 }
      );
    }

    const supabase = serverSupabase;

    // Step 2: Verify message exists and user has access
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Step 3: Verify access
    const hasAccess =
      message.sender_id === user.id || message.receiver_id === user.id;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to view reactions for this message' },
        { status: 403 }
      );
    }

    // Step 4: Fetch all reactions for this message
    const { data: reactions, error: reactionsError } = await supabase
      .from('message_reactions')
      .select('id, emoji, user_id, created_at')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    if (reactionsError) {
      console.error('Error fetching reactions:', reactionsError);
      throw new Error('Failed to fetch reactions');
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
    console.error('Error fetching reactions:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching reactions',
      },
      { status: 500 }
    );
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
