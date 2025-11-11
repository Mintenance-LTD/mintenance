import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCSRF } from '@/lib/csrf';

// Direct Supabase configuration for testing
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const body = await request.json();
    const { email, password, firstName, lastName, role, phone } = body;

    console.log('Test registration attempt:', { email, firstName, lastName, role });

    // Simple validation
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Hash password (simple bcrypt for testing)
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user directly in database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role: role || 'homeowner',
        phone: phone || null,
        email_verified: false
      }])
      .select();

    if (userError) {
      console.error('Database error:', userError);
      return NextResponse.json(
        { error: 'Failed to create user', details: userError.message },
        { status: 500 }
      );
    }

    console.log('User created successfully:', userData);

    return NextResponse.json(
      {
        message: 'Registration successful',
        user: {
          id: userData[0].id,
          email: userData[0].email,
          firstName: userData[0].first_name,
          lastName: userData[0].last_name,
          role: userData[0].role
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
