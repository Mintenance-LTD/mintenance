import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';

// This is a debug endpoint to delete a user from public.users table
export async function DELETE(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // Only allow this in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        error: 'This endpoint is only available in development' 
      }, { status: 403 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the user
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (findError || !user) {
      return NextResponse.json({ 
        error: 'User not found',
        details: findError?.message 
      }, { status: 404 });
    }

    // Delete the user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      logger.error('Failed to delete user', deleteError, { service: 'debug' });
      return NextResponse.json({ 
        error: 'Failed to delete user',
        details: deleteError.message 
      }, { status: 500 });
    }

    logger.info('User deleted from public.users', { 
      service: 'debug',
      userId: user.id,
      email: user.email 
    });

    return NextResponse.json({
      success: true,
      message: `User ${email} deleted successfully`,
      deletedUser: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`
      }
    });

  } catch (error) {
    logger.error('Debug delete failed', error, { service: 'debug' });
    return NextResponse.json(
      { 
        error: 'Delete failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

