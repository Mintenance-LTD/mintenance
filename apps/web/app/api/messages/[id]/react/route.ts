import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { messageReactionSchema } from '@/lib/validation/schemas';
import { withApiHandler } from '@/lib/api/with-api-handler';

// ==========================================================
// POST /api/messages/:id/react
// Toggle reaction on a message (add if not exists, remove if exists)
// ==========================================================

export const POST = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  // Validate and sanitize input using Zod schema
  const validation = await validateRequest(request, messageReactionSchema);
  if (validation instanceof NextResponse) return validation;
  const { data: validatedReaction } = validation;

  const { emoji } = validatedReaction;
  const messageId = params.id as string;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(messageId)) {
    throw new BadRequestError('Invalid message ID format');
  }

  // Verify message exists and user has access
  const { data: message, error: messageError } = await serverSupabase
    .from('messages')
    .select('id, sender_id, receiver_id')
    .eq('id', messageId)
    .single();

  if (messageError || !message) {
    throw new NotFoundError('Message not found');
  }

  // Verify user has access (must be sender or receiver)
  const hasAccess = message.sender_id === user.id || message.receiver_id === user.id;

  if (!hasAccess) {
    throw new ForbiddenError('You do not have permission to react to this message');
  }

  // Check if reaction already exists (toggle behavior)
  const { data: existingReaction, error: fetchError } = await serverSupabase
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
    // Remove reaction (toggle off)
    const { error: deleteError } = await serverSupabase
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

    return NextResponse.json({ success: true, action: 'removed', emoji, messageId });
  } else {
    // Add reaction (toggle on)
    const { error: insertError } = await serverSupabase
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

    return NextResponse.json({ success: true, action: 'added', emoji, messageId });
  }
});

// ==========================================================
// GET /api/messages/:id/react
// Fetch all reactions for a message (grouped by emoji)
// ==========================================================

export const GET = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  const messageId = params.id as string;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(messageId)) {
    throw new BadRequestError('Invalid message ID format');
  }

  // Verify message exists and user has access
  const { data: message, error: messageError } = await serverSupabase
    .from('messages')
    .select('id, sender_id, receiver_id')
    .eq('id', messageId)
    .single();

  if (messageError || !message) {
    throw new NotFoundError('Message not found');
  }

  // Verify access
  const hasAccess = message.sender_id === user.id || message.receiver_id === user.id;

  if (!hasAccess) {
    throw new ForbiddenError('You do not have permission to view reactions for this message');
  }

  // Fetch all reactions for this message
  const { data: reactions, error: reactionsError } = await serverSupabase
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

  // Group reactions by emoji
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
    {} as Record<string, { emoji: string; count: number; users: string[]; userReacted: boolean }>
  );

  return NextResponse.json({
    success: true,
    messageId,
    reactions: Object.values(grouped),
    totalReactions: reactions?.length || 0,
  });
});

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
