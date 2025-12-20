import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

/**
 * DELETE /api/account/delete
 * 
 * Soft deletes a user account by setting deleted_at timestamp.
 * This allows for account recovery if needed and maintains data integrity.
 */
export async function DELETE(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the user is trying to delete their own account
    const body = await request.json().catch(() => ({}));
    const { userId, confirmation } = body;

    if (!userId || userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own account' },
        { status: 403 }
      );
    }

    if (confirmation !== 'DELETE') {
      return NextResponse.json(
        { error: 'Confirmation text must be "DELETE"' },
        { status: 400 }
      );
    }

    // Check if account is already deleted
    const { data: existingUser, error: fetchError } = await serverSupabase
      .from('users')
      .select('id, deleted_at')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      logger.error('Error fetching user for deletion', { 
        userId: user.id, 
        error: fetchError.message 
      });
      return NextResponse.json(
        { error: 'Failed to verify account status' },
        { status: 500 }
      );
    }

    if (existingUser?.deleted_at) {
      return NextResponse.json(
        { error: 'Account is already deleted' },
        { status: 400 }
      );
    }

    // Soft delete: Set deleted_at timestamp
    // This preserves data for potential recovery while marking the account as deleted
    const { error: deleteError } = await serverSupabase
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        email: `deleted_${Date.now()}_${user.email}`, // Anonymize email to prevent reuse
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (deleteError) {
      logger.error('Error deleting user account', { 
        userId: user.id, 
        error: deleteError.message 
      });
      return NextResponse.json(
        { error: 'Failed to delete account. Please try again.' },
        { status: 500 }
      );
    }

    logger.info('User account deleted', { userId: user.id });

    return NextResponse.json(
      { 
        message: 'Account deleted successfully',
        deleted: true 
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Unexpected error in account deletion', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

