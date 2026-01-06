import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';

export async function GET() {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔵 Testing Edge Function');

    const { data, error } = await serverSupabase.functions.invoke('test-payout', {
      body: { test: true },
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    console.log('🔍 Test Response:', JSON.stringify({ data, error }, null, 2));

    return NextResponse.json({
      data,
      error: error ? { name: error.name, message: error.message } : null,
    });
  } catch (error) {
    console.error('🔴 Test Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
