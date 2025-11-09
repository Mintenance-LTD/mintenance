import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This is a debug endpoint to check if an email exists in either table
export async function POST(request: NextRequest) {
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check public.users table
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, created_at')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Check auth.users table
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    const authUser = authUsers?.users?.find(u => u.email === email.toLowerCase().trim());

    return NextResponse.json({
      email,
      inPublicUsers: !!publicUser && !publicError,
      publicUser: publicUser || null,
      inAuthUsers: !!authUser,
      authUser: authUser ? {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at
      } : null,
      summary: {
        totalAuthUsers: authUsers?.users?.length || 0,
        message: publicUser && !authUser 
          ? '⚠️ User exists in public.users but NOT in auth.users (Supabase Auth)'
          : !publicUser && authUser
          ? '⚠️ User exists in auth.users but NOT in public.users'
          : !publicUser && !authUser
          ? '✅ User does not exist in either table'
          : '✅ User exists in both tables'
      }
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Debug check failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

